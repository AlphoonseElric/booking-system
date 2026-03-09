import Anthropic from '@anthropic-ai/sdk';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CheckAvailabilityUseCase } from '../../application/use-cases/bookings/check-availability.use-case';
import { CreateBookingUseCase } from '../../application/use-cases/bookings/create-booking.use-case';
import { GetUserBookingsUseCase } from '../../application/use-cases/bookings/get-user-bookings.use-case';
import { CancelBookingUseCase } from '../../application/use-cases/bookings/cancel-booking.use-case';
import { AiChatMessageDto } from '../../application/dtos/ai-chat.dto';

const MAX_ITERATIONS = 10;

const SYSTEM_PROMPT = `You are a helpful booking assistant for a calendar scheduling system.
Today's date and time is: {TODAY}.
Help users check availability, create, list, and cancel bookings using the available tools.

When interpreting relative dates:
- "afternoon" means 13:00–17:00 local time (use UTC equivalents)
- "morning" means 08:00–12:00 local time
- "next Tuesday" means the upcoming Tuesday from today's date
- Always use ISO 8601 UTC format for tool calls (e.g. 2026-03-10T14:00:00Z)

Workflow:
1. Always call check_availability before creating a booking
2. If unavailable, tell the user clearly and suggest checking a different time
3. After creating or cancelling, confirm with a friendly summary

Be concise, friendly, and always confirm what action you took.`;

@Injectable()
export class ClaudeService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ClaudeService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly checkAvailabilityUseCase: CheckAvailabilityUseCase,
    private readonly createBookingUseCase: CreateBookingUseCase,
    private readonly getUserBookingsUseCase: GetUserBookingsUseCase,
    private readonly cancelBookingUseCase: CancelBookingUseCase,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async chat(
    userId: string,
    messages: AiChatMessageDto[],
    googleAccessToken: string,
    googleRefreshToken: string,
  ): Promise<{ reply: string; bookingsChanged: boolean }> {
    let bookingsChanged = false;
    const systemPrompt = SYSTEM_PROMPT.replace('{TODAY}', new Date().toISOString());

    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      let response: Anthropic.Message;
      try {
        response = await this.client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          tools: this.getToolDefinitions(),
          messages: anthropicMessages,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Anthropic API error: ${msg}`, err);
        throw new ServiceUnavailableException(`AI service error: ${msg}`);
      }

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((b) => b.type === 'text');
        const reply = textBlock ? textBlock.text : 'Done.';
        return { reply, bookingsChanged };
      }

      if (response.stop_reason === 'tool_use') {
        // Append assistant turn (may contain text + tool_use blocks)
        anthropicMessages.push({ role: 'assistant', content: response.content });

        // Execute all tool calls and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          this.logger.log(`Executing tool: ${block.name} with input: ${JSON.stringify(block.input)}`);
          const result = await this.executeTool(
            block.name,
            block.input as Record<string, string>,
            userId,
            googleAccessToken,
            googleRefreshToken,
            (changed) => { bookingsChanged = bookingsChanged || changed; },
          );

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }

        anthropicMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Unexpected stop reason
      this.logger.warn(`Unexpected stop_reason: ${response.stop_reason}`);
      break;
    }

    return { reply: 'I was unable to complete the request. Please try again.', bookingsChanged };
  }

  private async executeTool(
    name: string,
    input: Record<string, string>,
    userId: string,
    googleAccessToken: string,
    googleRefreshToken: string,
    onChanged: (changed: boolean) => void,
  ): Promise<string> {
    try {
      switch (name) {
        case 'check_availability': {
          const result = await this.checkAvailabilityUseCase.execute(userId, {
            startTime: input.startTime,
            endTime: input.endTime,
            googleAccessToken,
            googleRefreshToken,
          });
          return JSON.stringify(result);
        }

        case 'create_booking': {
          const booking = await this.createBookingUseCase.execute(userId, {
            title: input.title,
            startTime: input.startTime,
            endTime: input.endTime,
            googleAccessToken,
            googleRefreshToken,
          });
          onChanged(true);
          return JSON.stringify({
            id: booking.id,
            title: booking.title,
            startTime: booking.startTime,
            endTime: booking.endTime,
          });
        }

        case 'list_bookings': {
          const bookings = await this.getUserBookingsUseCase.execute(userId);
          return JSON.stringify(
            bookings.map((b) => ({
              id: b.id,
              title: b.title,
              startTime: b.startTime,
              endTime: b.endTime,
            })),
          );
        }

        case 'cancel_booking': {
          await this.cancelBookingUseCase.execute(
            userId,
            input.bookingId,
            googleAccessToken,
            googleRefreshToken,
          );
          onChanged(true);
          return JSON.stringify({ success: true, bookingId: input.bookingId });
        }

        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Tool ${name} failed: ${message}`);
      return JSON.stringify({ error: message });
    }
  }

  private getToolDefinitions(): Anthropic.Tool[] {
    return [
      {
        name: 'check_availability',
        description:
          'Check if a time slot is available. Checks both the local database and Google Calendar in parallel. Always call this before creating a booking.',
        input_schema: {
          type: 'object',
          properties: {
            startTime: {
              type: 'string',
              description: 'Start time in ISO 8601 UTC format, e.g. 2026-03-10T14:00:00Z',
            },
            endTime: {
              type: 'string',
              description: 'End time in ISO 8601 UTC format, e.g. 2026-03-10T15:00:00Z',
            },
          },
          required: ['startTime', 'endTime'],
        },
      },
      {
        name: 'create_booking',
        description:
          'Create a new booking. Always check availability first. Creates the booking in the local database and Google Calendar.',
        input_schema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title or name of the booking, e.g. "Team Sync"',
            },
            startTime: {
              type: 'string',
              description: 'Start time in ISO 8601 UTC format',
            },
            endTime: {
              type: 'string',
              description: 'End time in ISO 8601 UTC format',
            },
          },
          required: ['title', 'startTime', 'endTime'],
        },
      },
      {
        name: 'list_bookings',
        description: 'List all bookings for the current user.',
        input_schema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'cancel_booking',
        description:
          'Cancel a booking by its ID. Removes it from the database and Google Calendar. Use list_bookings first if you need the booking ID.',
        input_schema: {
          type: 'object',
          properties: {
            bookingId: {
              type: 'string',
              description: 'The unique ID of the booking to cancel',
            },
          },
          required: ['bookingId'],
        },
      },
    ];
  }
}

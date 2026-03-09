import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../../domain/entities/user.entity';
import { ProcessAiChatUseCase } from '../../../application/use-cases/ai/process-ai-chat.use-case';
import { AiChatRequestDto, AiChatResponseDto } from '../../../application/dtos/ai-chat.dto';

@ApiTags('AI Booking Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/booking')
export class AiBookingController {
  constructor(private readonly processAiChatUseCase: ProcessAiChatUseCase) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a natural language message to the AI booking assistant',
    description:
      'Processes a conversation with Claude AI (claude-haiku-4-5). ' +
      'Claude interprets the user intent and calls booking tools (check_availability, ' +
      'create_booking, list_bookings, cancel_booking) as needed, then returns a ' +
      'friendly natural language response. Pass the full conversation history in ' +
      'the messages array for multi-turn context.',
  })
  @ApiResponse({
    status: 200,
    description: "AI assistant's reply and a flag indicating if bookings changed",
    type: AiChatResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT' })
  @ApiResponse({ status: 503, description: 'Claude API or Google Calendar temporarily unavailable' })
  async chat(
    @CurrentUser() user: User,
    @Body() dto: AiChatRequestDto,
  ): Promise<AiChatResponseDto> {
    return this.processAiChatUseCase.execute(user.id, dto);
  }
}

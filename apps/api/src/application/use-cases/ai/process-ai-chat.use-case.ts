import { Injectable, Logger } from '@nestjs/common';
import { ClaudeService } from '../../../infrastructure/ai/claude.service';
import { AiChatRequestDto, AiChatResponseDto } from '../../dtos/ai-chat.dto';

@Injectable()
export class ProcessAiChatUseCase {
  private readonly logger = new Logger(ProcessAiChatUseCase.name);

  constructor(private readonly claudeService: ClaudeService) {}

  async execute(userId: string, dto: AiChatRequestDto): Promise<AiChatResponseDto> {
    this.logger.log(`AI chat request from user ${userId} — ${dto.messages.length} message(s)`);

    const result = await this.claudeService.chat(
      userId,
      dto.messages,
      dto.googleAccessToken,
      dto.googleRefreshToken,
    );

    return {
      reply: result.reply,
      bookingsChanged: result.bookingsChanged,
    };
  }
}

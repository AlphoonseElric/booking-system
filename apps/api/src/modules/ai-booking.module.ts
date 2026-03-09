import { Module } from '@nestjs/common';
import { BookingsModule } from './bookings.module';
import { AiBookingController } from '../infrastructure/http/controllers/ai-booking.controller';
import { ProcessAiChatUseCase } from '../application/use-cases/ai/process-ai-chat.use-case';
import { ClaudeService } from '../infrastructure/ai/claude.service';

@Module({
  imports: [BookingsModule],
  controllers: [AiBookingController],
  providers: [ProcessAiChatUseCase, ClaudeService],
})
export class AiBookingModule {}

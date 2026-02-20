import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ICalendarWatchRepository,
  CALENDAR_WATCH_REPOSITORY,
} from '../../../domain/repositories/calendar-watch.repository.interface';
import { CreateWatchUseCase } from './create-watch.use-case';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class RenewWatchesUseCase {
  private readonly logger = new Logger(RenewWatchesUseCase.name);

  constructor(
    @Inject(CALENDAR_WATCH_REPOSITORY) private readonly watchRepository: ICalendarWatchRepository,
    private readonly createWatchUseCase: CreateWatchUseCase,
  ) {}

  async execute(): Promise<void> {
    const expiringSoon = await this.watchRepository.findExpiringSoon(TWENTY_FOUR_HOURS_MS);

    this.logger.log(`Found ${expiringSoon.length} watch(es) expiring within 24 hours`);

    for (const watch of expiringSoon) {
      try {
        await this.createWatchUseCase.execute(watch.userId);
        this.logger.log(`Renewed calendar watch for user ${watch.userId}`);
      } catch (err) {
        this.logger.error(`Failed to renew watch for user ${watch.userId}: ${err.message}`);
        // Continue with the next watch — one failure must not block the rest
      }
    }
  }
}

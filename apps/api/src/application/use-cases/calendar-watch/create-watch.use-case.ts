import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  ICalendarWatchRepository,
  CALENDAR_WATCH_REPOSITORY,
} from '../../../domain/repositories/calendar-watch.repository.interface';
import {
  ICalendarWatchService,
  CALENDAR_WATCH_SERVICE,
} from '../../../domain/services/calendar-watch.service.interface';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { CalendarWatch } from '../../../domain/entities/calendar-watch.entity';

@Injectable()
export class CreateWatchUseCase {
  private readonly logger = new Logger(CreateWatchUseCase.name);

  constructor(
    @Inject(CALENDAR_WATCH_REPOSITORY) private readonly watchRepository: ICalendarWatchRepository,
    @Inject(CALENDAR_WATCH_SERVICE) private readonly watchService: ICalendarWatchService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(userId: string): Promise<CalendarWatch> {
    const user = await this.userRepository.findById(userId);

    if (!user?.googleRefreshToken) {
      throw new BadRequestException(
        'Google refresh token not stored. Call POST /calendar/watch/refresh-token first.',
      );
    }

    // Stop existing watch if still active (best-effort)
    const existing = await this.watchRepository.findByUserId(userId);
    if (existing && !existing.isExpired()) {
      try {
        await this.watchService.stopWatch(
          user.googleRefreshToken,
          existing.channelId,
          existing.resourceId,
        );
      } catch (err) {
        this.logger.warn(`Failed to stop existing watch ${existing.channelId}: ${err.message}`);
      }
    }

    const channelId = randomUUID();
    const channelToken = randomUUID();
    const webhookBaseUrl = this.configService.get<string>('WEBHOOK_BASE_URL');
    const webhookUrl = `${webhookBaseUrl}/webhooks/google-calendar`;

    const registration = await this.watchService.watchEvents(
      user.googleRefreshToken,
      channelId,
      channelToken,
      webhookUrl,
    );

    const watch = await this.watchRepository.upsert({
      userId,
      channelId: registration.channelId,
      resourceId: registration.resourceId,
      channelToken,
      expiration: new Date(registration.expiration),
    });

    this.logger.log(
      `Calendar watch created for user ${userId}, expires ${watch.expiration.toISOString()}`,
    );

    return watch;
  }
}

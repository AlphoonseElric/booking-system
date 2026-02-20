import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { GoogleCalendarWatchService } from '../infrastructure/google-calendar/google-calendar-watch.service';
import { CALENDAR_WATCH_SERVICE } from '../domain/services/calendar-watch.service.interface';
import { WebhookController } from '../infrastructure/http/controllers/webhook.controller';
import { CalendarWatchController } from '../infrastructure/http/controllers/calendar-watch.controller';
import { CreateWatchUseCase } from '../application/use-cases/calendar-watch/create-watch.use-case';
import { HandleWebhookUseCase } from '../application/use-cases/calendar-watch/handle-webhook.use-case';
import { StoreRefreshTokenUseCase } from '../application/use-cases/calendar-watch/store-refresh-token.use-case';
import { RenewWatchesUseCase } from '../application/use-cases/calendar-watch/renew-watches.use-case';
import { WatchRenewalCron } from '../infrastructure/cron/watch-renewal.cron';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [WebhookController, CalendarWatchController],
  providers: [
    { provide: CALENDAR_WATCH_SERVICE, useClass: GoogleCalendarWatchService },
    CreateWatchUseCase,
    HandleWebhookUseCase,
    StoreRefreshTokenUseCase,
    RenewWatchesUseCase,
    WatchRenewalCron,
  ],
})
export class CalendarWatchModule {}

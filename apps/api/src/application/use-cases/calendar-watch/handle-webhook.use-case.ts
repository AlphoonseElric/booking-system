import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ICalendarWatchRepository,
  CALENDAR_WATCH_REPOSITORY,
} from '../../../domain/repositories/calendar-watch.repository.interface';
import {
  ICalendarWatchService,
  CALENDAR_WATCH_SERVICE,
} from '../../../domain/services/calendar-watch.service.interface';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../../domain/repositories/booking.repository.interface';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';

@Injectable()
export class HandleWebhookUseCase {
  private readonly logger = new Logger(HandleWebhookUseCase.name);

  constructor(
    @Inject(CALENDAR_WATCH_REPOSITORY) private readonly watchRepository: ICalendarWatchRepository,
    @Inject(CALENDAR_WATCH_SERVICE) private readonly watchService: ICalendarWatchService,
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: IBookingRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async execute(channelId: string, channelToken: string, resourceState: string): Promise<void> {
    // 1. Look up the watch by channelId
    const watch = await this.watchRepository.findByChannelId(channelId);
    if (!watch) {
      this.logger.warn(`Webhook received for unknown channel: ${channelId}`);
      return;
    }

    // 2. Validate the channel token to ensure this is a legitimate notification
    if (watch.channelToken !== channelToken) {
      this.logger.warn(`Invalid channel token for channel ${channelId}`);
      return;
    }

    // 3. Ignore the initial sync message Google sends when a watch is created
    if (resourceState === 'sync') {
      this.logger.log(`Sync notification received for channel ${channelId} (user ${watch.userId})`);
      return;
    }

    this.logger.log(
      `Calendar change detected for user ${watch.userId}, state: ${resourceState}`,
    );

    // 4. Reconcile local bookings against Google Calendar
    try {
      await this.reconcile(watch.userId);
    } catch (err) {
      this.logger.error(`Reconciliation failed for user ${watch.userId}: ${err.message}`);
      // Do not re-throw — we must not let the webhook handler return an error to Google
    }
  }

  private async reconcile(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user?.googleRefreshToken) {
      this.logger.warn(`No refresh token stored for user ${userId}, skipping reconciliation`);
      return;
    }

    const bookings = await this.bookingRepository.findAllByUser(userId);
    const bookingsWithEvent = bookings.filter((b) => b.googleEventId !== null);

    for (const booking of bookingsWithEvent) {
      try {
        const event = await this.watchService.getEvent(
          user.googleRefreshToken,
          booking.googleEventId!,
        );

        if (event === null) {
          // Event was deleted or cancelled externally — remove the local booking
          await this.bookingRepository.delete(booking.id);
          this.logger.log(
            `Booking ${booking.id} deleted — Google event ${booking.googleEventId} was removed externally`,
          );
          continue;
        }

        // Check if times changed
        const startChanged = event.startTime.getTime() !== booking.startTime.getTime();
        const endChanged = event.endTime.getTime() !== booking.endTime.getTime();

        if (startChanged || endChanged) {
          await this.bookingRepository.update(booking.id, {
            startTime: event.startTime,
            endTime: event.endTime,
          });
          this.logger.log(
            `Booking ${booking.id} updated — Google event ${booking.googleEventId} was modified externally`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to reconcile booking ${booking.id} (event ${booking.googleEventId}): ${err.message}`,
        );
        // Continue with remaining bookings
      }
    }
  }
}

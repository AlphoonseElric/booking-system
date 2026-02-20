import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../../domain/repositories/booking.repository.interface';
import {
  ICalendarService,
  CALENDAR_SERVICE,
} from '../../../domain/services/calendar.service.interface';

@Injectable()
export class CancelBookingUseCase {
  private readonly logger = new Logger(CancelBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: IBookingRepository,
    @Inject(CALENDAR_SERVICE) private readonly calendarService: ICalendarService,
  ) {}

  async execute(
    userId: string,
    bookingId: string,
    googleAccessToken: string,
    googleRefreshToken: string,
  ): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    if (!booking.isOwnedBy(userId)) {
      throw new ForbiddenException('You do not have permission to cancel this booking');
    }

    if (booking.googleEventId) {
      try {
        await this.calendarService.deleteEvent(
          googleAccessToken,
          googleRefreshToken,
          booking.googleEventId,
        );
      } catch (error) {
        this.logger.warn(
          `Could not delete Google Calendar event ${booking.googleEventId}: ${error.message}`,
        );
      }
    }

    await this.bookingRepository.delete(bookingId);
  }
}

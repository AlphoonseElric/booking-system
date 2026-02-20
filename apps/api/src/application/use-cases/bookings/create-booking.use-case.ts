import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../../domain/repositories/booking.repository.interface';
import { ICalendarService, CALENDAR_SERVICE } from '../../../domain/services/calendar.service.interface';
import { Booking } from '../../../domain/entities/booking.entity';
import { CreateBookingDto } from '../../dtos/create-booking.dto';

@Injectable()
export class CreateBookingUseCase {
  private readonly logger = new Logger(CreateBookingUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: IBookingRepository,
    @Inject(CALENDAR_SERVICE) private readonly calendarService: ICalendarService,
  ) {}

  async execute(userId: string, dto: CreateBookingDto): Promise<Booking> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    if (startTime < new Date()) {
      throw new BadRequestException('Cannot book a time slot in the past');
    }

    // Re-check for conflicts right before creating (prevents race conditions)
    const [dbConflicts, calendarConflicts] = await Promise.all([
      this.bookingRepository.findOverlapping(userId, startTime, endTime),
      this.calendarService.checkConflicts(dto.googleAccessToken, startTime, endTime).catch((err) => {
        this.logger.error('Google Calendar check failed during booking creation', err);
        throw new ServiceUnavailableException(
          'Cannot confirm booking: Google Calendar is temporarily unavailable.',
        );
      }),
    ]);

    if (dbConflicts.length > 0) {
      throw new ConflictException(
        `Booking conflicts with existing reservation: "${dbConflicts[0].title}"`,
      );
    }

    if (calendarConflicts.length > 0) {
      throw new ConflictException(
        `Booking conflicts with Google Calendar event: "${calendarConflicts[0].title}"`,
      );
    }

    // Persist in local DB first
    const booking = await this.bookingRepository.create({
      title: dto.title,
      startTime,
      endTime,
      userId,
    });

    // Create event in Google Calendar — if it fails, rollback DB record
    try {
      const googleEventId = await this.calendarService.createEvent(dto.googleAccessToken, {
        title: dto.title,
        startTime,
        endTime,
        description: `Booking created via Booking System (ID: ${booking.id})`,
      });

      return this.bookingRepository.updateGoogleEventId(booking.id, googleEventId);
    } catch (error) {
      this.logger.error(`Failed to create Google Calendar event for booking ${booking.id}`, error);
      // Rollback: remove the booking from DB to keep both systems consistent
      await this.bookingRepository.delete(booking.id);
      throw new ServiceUnavailableException(
        'Booking could not be confirmed: failed to create Google Calendar event. Please try again.',
      );
    }
  }
}

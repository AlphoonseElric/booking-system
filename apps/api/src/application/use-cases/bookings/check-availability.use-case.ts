import {
  Injectable,
  Inject,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../../domain/repositories/booking.repository.interface';
import {
  ICalendarService,
  CALENDAR_SERVICE,
} from '../../../domain/services/calendar.service.interface';
import { CheckAvailabilityDto, AvailabilityResultDto } from '../../dtos/check-availability.dto';

@Injectable()
export class CheckAvailabilityUseCase {
  private readonly logger = new Logger(CheckAvailabilityUseCase.name);

  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: IBookingRepository,
    @Inject(CALENDAR_SERVICE) private readonly calendarService: ICalendarService,
  ) {}

  async execute(userId: string, dto: CheckAvailabilityDto): Promise<AvailabilityResultDto> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be before endTime');
    }

    if (startTime < new Date()) {
      throw new BadRequestException('Cannot book a time slot in the past');
    }

    let dbConflicts: AvailabilityResultDto['dbConflicts'] = [];
    let calendarConflicts: AvailabilityResultDto['calendarConflicts'] = [];

    try {
      const [overlappingBookings, googleConflicts] = await Promise.all([
        this.bookingRepository.findOverlapping(userId, startTime, endTime),
        this.calendarService.checkConflicts(
          dto.googleAccessToken,
          dto.googleRefreshToken,
          startTime,
          endTime,
        ),
      ]);

      dbConflicts = overlappingBookings.map((b) => ({
        id: b.id,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
      }));

      calendarConflicts = googleConflicts;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      this.logger.error('Conflict check failed', error);
      throw new ServiceUnavailableException(
        'Failed to verify availability. Google Calendar may be temporarily unavailable.',
      );
    }

    return {
      available: dbConflicts.length === 0 && calendarConflicts.length === 0,
      dbConflicts,
      calendarConflicts,
    };
  }
}

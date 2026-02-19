import { Module } from '@nestjs/common';
import { BookingsController } from '../infrastructure/http/controllers/bookings.controller';
import { GoogleCalendarService } from '../infrastructure/google-calendar/google-calendar.service';
import { CheckAvailabilityUseCase } from '../application/use-cases/bookings/check-availability.use-case';
import { CreateBookingUseCase } from '../application/use-cases/bookings/create-booking.use-case';
import { GetUserBookingsUseCase } from '../application/use-cases/bookings/get-user-bookings.use-case';
import { CancelBookingUseCase } from '../application/use-cases/bookings/cancel-booking.use-case';
import { CALENDAR_SERVICE } from '../domain/services/calendar.service.interface';

@Module({
  controllers: [BookingsController],
  providers: [
    // Bind the port (ICalendarService) to the adapter (GoogleCalendarService)
    // To swap to another provider (Outlook, iCal), only change this line:
    { provide: CALENDAR_SERVICE, useClass: GoogleCalendarService },
    CheckAvailabilityUseCase,
    CreateBookingUseCase,
    GetUserBookingsUseCase,
    CancelBookingUseCase,
  ],
})
export class BookingsModule {}

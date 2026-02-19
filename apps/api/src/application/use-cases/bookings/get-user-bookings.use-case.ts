import { Injectable, Inject } from '@nestjs/common';
import { IBookingRepository, BOOKING_REPOSITORY } from '../../../domain/repositories/booking.repository.interface';
import { Booking } from '../../../domain/entities/booking.entity';

@Injectable()
export class GetUserBookingsUseCase {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(userId: string): Promise<Booking[]> {
    return this.bookingRepository.findAllByUser(userId);
  }
}

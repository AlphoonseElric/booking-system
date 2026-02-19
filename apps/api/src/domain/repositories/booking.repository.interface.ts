import { Booking } from '../entities/booking.entity';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface CreateBookingData {
  title: string;
  startTime: Date;
  endTime: Date;
  userId: string;
}

export interface IBookingRepository {
  findOverlapping(userId: string, startTime: Date, endTime: Date, excludeId?: string): Promise<Booking[]>;
  create(data: CreateBookingData): Promise<Booking>;
  findAllByUser(userId: string): Promise<Booking[]>;
  findById(id: string): Promise<Booking | null>;
  delete(id: string): Promise<void>;
  updateGoogleEventId(id: string, googleEventId: string): Promise<Booking>;
}

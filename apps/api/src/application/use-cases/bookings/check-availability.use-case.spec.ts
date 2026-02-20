import { Test } from '@nestjs/testing';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { CheckAvailabilityUseCase } from './check-availability.use-case';
import { BOOKING_REPOSITORY } from '../../../domain/repositories/booking.repository.interface';
import { CALENDAR_SERVICE } from '../../../domain/services/calendar.service.interface';
import { Booking } from '../../../domain/entities/booking.entity';

const makeFutureDate = (hoursFromNow: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
};

describe('CheckAvailabilityUseCase', () => {
  let useCase: CheckAvailabilityUseCase;
  let bookingRepo: { findOverlapping: jest.Mock };
  let calendarService: { checkConflicts: jest.Mock };

  beforeEach(async () => {
    bookingRepo = { findOverlapping: jest.fn() };
    calendarService = { checkConflicts: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CheckAvailabilityUseCase,
        { provide: BOOKING_REPOSITORY, useValue: bookingRepo },
        { provide: CALENDAR_SERVICE, useValue: calendarService },
      ],
    }).compile();

    useCase = module.get(CheckAvailabilityUseCase);
  });

  it('should return available=true when no conflicts exist', async () => {
    bookingRepo.findOverlapping.mockResolvedValue([]);
    calendarService.checkConflicts.mockResolvedValue([]);

    const result = await useCase.execute('user-1', {
      startTime: makeFutureDate(1),
      endTime: makeFutureDate(2),
      googleAccessToken: 'token',
    });

    expect(result.available).toBe(true);
    expect(result.dbConflicts).toHaveLength(0);
    expect(result.calendarConflicts).toHaveLength(0);
    // Verify both checks ran in parallel
    expect(bookingRepo.findOverlapping).toHaveBeenCalledTimes(1);
    expect(calendarService.checkConflicts).toHaveBeenCalledTimes(1);
  });

  it('should return available=false when a DB conflict exists', async () => {
    const conflictingBooking = new Booking('b-1', 'Existing Meeting', new Date(), new Date(), 'user-1', null, new Date());
    bookingRepo.findOverlapping.mockResolvedValue([conflictingBooking]);
    calendarService.checkConflicts.mockResolvedValue([]);

    const result = await useCase.execute('user-1', {
      startTime: makeFutureDate(1),
      endTime: makeFutureDate(2),
      googleAccessToken: 'token',
    });

    expect(result.available).toBe(false);
    expect(result.dbConflicts).toHaveLength(1);
    expect(result.dbConflicts[0].title).toBe('Existing Meeting');
  });

  it('should return available=false when a Google Calendar conflict exists', async () => {
    bookingRepo.findOverlapping.mockResolvedValue([]);
    calendarService.checkConflicts.mockResolvedValue([
      { id: 'gcal-1', title: 'Doctor Appointment', start: new Date(), end: new Date() },
    ]);

    const result = await useCase.execute('user-1', {
      startTime: makeFutureDate(1),
      endTime: makeFutureDate(2),
      googleAccessToken: 'token',
    });

    expect(result.available).toBe(false);
    expect(result.calendarConflicts).toHaveLength(1);
    expect(result.calendarConflicts[0].title).toBe('Doctor Appointment');
  });

  it('should return available=false when conflicts exist in both sources', async () => {
    const conflictingBooking = new Booking('b-1', 'DB Meeting', new Date(), new Date(), 'user-1', null, new Date());
    bookingRepo.findOverlapping.mockResolvedValue([conflictingBooking]);
    calendarService.checkConflicts.mockResolvedValue([
      { id: 'gcal-1', title: 'GCal Event', start: new Date(), end: new Date() },
    ]);

    const result = await useCase.execute('user-1', {
      startTime: makeFutureDate(1),
      endTime: makeFutureDate(2),
      googleAccessToken: 'token',
    });

    expect(result.available).toBe(false);
    expect(result.dbConflicts).toHaveLength(1);
    expect(result.calendarConflicts).toHaveLength(1);
  });

  it('should throw BadRequestException when startTime >= endTime', async () => {
    await expect(
      useCase.execute('user-1', {
        startTime: makeFutureDate(2),
        endTime: makeFutureDate(1),
        googleAccessToken: 'token',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when booking is in the past', async () => {
    const pastTime = new Date();
    pastTime.setHours(pastTime.getHours() - 2);

    await expect(
      useCase.execute('user-1', {
        startTime: pastTime.toISOString(),
        endTime: makeFutureDate(1),
        googleAccessToken: 'token',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw ServiceUnavailableException when Google Calendar fails', async () => {
    bookingRepo.findOverlapping.mockResolvedValue([]);
    calendarService.checkConflicts.mockRejectedValue(new Error('Network error'));

    await expect(
      useCase.execute('user-1', {
        startTime: makeFutureDate(1),
        endTime: makeFutureDate(2),
        googleAccessToken: 'token',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

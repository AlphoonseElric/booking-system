import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  IBookingRepository,
  CreateBookingData,
} from '../../../domain/repositories/booking.repository.interface';
import { Booking } from '../../../domain/entities/booking.entity';

@Injectable()
export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOverlapping(userId: string, startTime: Date, endTime: Date, excludeId?: string): Promise<Booking[]> {
    const records = await this.prisma.booking.findMany({
      where: {
        userId,
        id: excludeId ? { not: excludeId } : undefined,
        // Overlap condition: existing.start < new.end AND existing.end > new.start
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    });
    return records.map(this.toDomain);
  }

  async create(data: CreateBookingData): Promise<Booking> {
    const record = await this.prisma.booking.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        userId: data.userId,
      },
    });
    return this.toDomain(record);
  }

  async findAllByUser(userId: string): Promise<Booking[]> {
    const records = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });
    return records.map(this.toDomain);
  }

  async findById(id: string): Promise<Booking | null> {
    const record = await this.prisma.booking.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.booking.delete({ where: { id } });
  }

  async updateGoogleEventId(id: string, googleEventId: string): Promise<Booking> {
    const record = await this.prisma.booking.update({
      where: { id },
      data: { googleEventId },
    });
    return this.toDomain(record);
  }

  private toDomain(record: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    userId: string;
    googleEventId: string | null;
    createdAt: Date;
  }): Booking {
    return new Booking(
      record.id,
      record.title,
      record.startTime,
      record.endTime,
      record.userId,
      record.googleEventId,
      record.createdAt,
    );
  }
}

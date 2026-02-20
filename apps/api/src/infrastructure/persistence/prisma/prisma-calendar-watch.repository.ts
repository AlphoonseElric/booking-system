import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  ICalendarWatchRepository,
  CreateCalendarWatchData,
} from '../../../domain/repositories/calendar-watch.repository.interface';
import { CalendarWatch } from '../../../domain/entities/calendar-watch.entity';

@Injectable()
export class PrismaCalendarWatchRepository implements ICalendarWatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<CalendarWatch | null> {
    const record = await this.prisma.calendarWatch.findUnique({ where: { userId } });
    return record ? this.toDomain(record) : null;
  }

  async findByChannelId(channelId: string): Promise<CalendarWatch | null> {
    const record = await this.prisma.calendarWatch.findUnique({ where: { channelId } });
    return record ? this.toDomain(record) : null;
  }

  async findExpiringSoon(withinMs: number): Promise<CalendarWatch[]> {
    const cutoff = new Date(Date.now() + withinMs);
    const records = await this.prisma.calendarWatch.findMany({
      where: { expiration: { lt: cutoff } },
    });
    return records.map((r) => this.toDomain(r));
  }

  async upsert(data: CreateCalendarWatchData): Promise<CalendarWatch> {
    const record = await this.prisma.calendarWatch.upsert({
      where: { userId: data.userId },
      update: {
        channelId: data.channelId,
        resourceId: data.resourceId,
        channelToken: data.channelToken,
        expiration: data.expiration,
      },
      create: {
        userId: data.userId,
        channelId: data.channelId,
        resourceId: data.resourceId,
        channelToken: data.channelToken,
        expiration: data.expiration,
      },
    });
    return this.toDomain(record);
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.calendarWatch.deleteMany({ where: { userId } });
  }

  private toDomain(record: {
    id: string;
    userId: string;
    channelId: string;
    resourceId: string;
    channelToken: string;
    expiration: Date;
    createdAt: Date;
  }): CalendarWatch {
    return new CalendarWatch(
      record.id,
      record.userId,
      record.channelId,
      record.resourceId,
      record.channelToken,
      record.expiration,
      record.createdAt,
    );
  }
}

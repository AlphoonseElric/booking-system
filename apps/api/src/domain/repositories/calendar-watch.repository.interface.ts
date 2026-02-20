import { CalendarWatch } from '../entities/calendar-watch.entity';

export const CALENDAR_WATCH_REPOSITORY = Symbol('CALENDAR_WATCH_REPOSITORY');

export interface CreateCalendarWatchData {
  userId: string;
  channelId: string;
  resourceId: string;
  channelToken: string;
  expiration: Date;
}

export interface ICalendarWatchRepository {
  findByUserId(userId: string): Promise<CalendarWatch | null>;
  findByChannelId(channelId: string): Promise<CalendarWatch | null>;
  findExpiringSoon(withinMs: number): Promise<CalendarWatch[]>;
  upsert(data: CreateCalendarWatchData): Promise<CalendarWatch>;
  deleteByUserId(userId: string): Promise<void>;
}

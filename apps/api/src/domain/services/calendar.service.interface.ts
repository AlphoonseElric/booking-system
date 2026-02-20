export const CALENDAR_SERVICE = Symbol('CALENDAR_SERVICE');

export interface CalendarConflict {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export interface CreateCalendarEventData {
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
}

export interface ICalendarService {
  checkConflicts(
    accessToken: string,
    refreshToken: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CalendarConflict[]>;
  createEvent(
    accessToken: string,
    refreshToken: string,
    event: CreateCalendarEventData,
  ): Promise<string>;
  deleteEvent(accessToken: string, refreshToken: string, eventId: string): Promise<void>;
}

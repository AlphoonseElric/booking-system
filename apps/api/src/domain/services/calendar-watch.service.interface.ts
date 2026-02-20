export const CALENDAR_WATCH_SERVICE = Symbol('CALENDAR_WATCH_SERVICE');

export interface WatchRegistration {
  channelId: string;
  resourceId: string;
  expiration: number; // Unix timestamp in ms
}

export interface GoogleCalendarEvent {
  id: string;
  status: string; // 'confirmed' | 'cancelled' | 'tentative'
  title: string;
  startTime: Date;
  endTime: Date;
}

export interface ICalendarWatchService {
  watchEvents(
    refreshToken: string,
    channelId: string,
    channelToken: string,
    webhookUrl: string,
  ): Promise<WatchRegistration>;

  stopWatch(refreshToken: string, channelId: string, resourceId: string): Promise<void>;

  /** Returns the event, or null if it was deleted (404) or is cancelled */
  getEvent(refreshToken: string, eventId: string): Promise<GoogleCalendarEvent | null>;
}

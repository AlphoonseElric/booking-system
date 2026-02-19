import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import {
  ICalendarService,
  CalendarConflict,
  CreateCalendarEventData,
} from '../../domain/services/calendar.service.interface';

@Injectable()
export class GoogleCalendarService implements ICalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  async checkConflicts(
    accessToken: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CalendarConflict[]> {
    const calendar = this.buildCalendarClient(accessToken);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items ?? [];

    return events
      .filter((event) => event.status !== 'cancelled')
      .map((event) => ({
        id: event.id ?? '',
        title: event.summary ?? '(No title)',
        start: new Date(event.start?.dateTime ?? event.start?.date ?? ''),
        end: new Date(event.end?.dateTime ?? event.end?.date ?? ''),
      }));
  }

  async createEvent(accessToken: string, data: CreateCalendarEventData): Promise<string> {
    const calendar = this.buildCalendarClient(accessToken);

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: data.title,
        description: data.description,
        start: { dateTime: data.startTime.toISOString() },
        end: { dateTime: data.endTime.toISOString() },
      },
    });

    const eventId = response.data.id;
    if (!eventId) {
      throw new Error('Google Calendar did not return an event ID after creation');
    }

    this.logger.log(`Google Calendar event created: ${eventId}`);
    return eventId;
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const calendar = this.buildCalendarClient(accessToken);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    this.logger.log(`Google Calendar event deleted: ${eventId}`);
  }

  private buildCalendarClient(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.calendar({ version: 'v3', auth });
  }
}

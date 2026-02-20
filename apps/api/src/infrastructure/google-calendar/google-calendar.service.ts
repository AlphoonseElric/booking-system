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
    refreshToken: string,
    startTime: Date,
    endTime: Date,
  ): Promise<CalendarConflict[]> {
    const calendar = await this.buildCalendarClient(accessToken, refreshToken);

    try {
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
    } catch (error: any) {
      if (this.isAuthError(error)) {
        this.logger.warn('Access token expired, retrying with refresh token');
        const newAuth = await this.refreshAuthToken(refreshToken);
        const retryCalendar = google.calendar({ version: 'v3', auth: newAuth });

        const response = await retryCalendar.events.list({
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
      throw error;
    }
  }

  async createEvent(
    accessToken: string,
    refreshToken: string,
    data: CreateCalendarEventData,
  ): Promise<string> {
    const calendar = await this.buildCalendarClient(accessToken, refreshToken);

    try {
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
    } catch (error: any) {
      if (this.isAuthError(error)) {
        this.logger.warn('Access token expired, retrying with refresh token');
        const newAuth = await this.refreshAuthToken(refreshToken);
        const retryCalendar = google.calendar({ version: 'v3', auth: newAuth });

        const response = await retryCalendar.events.insert({
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
      throw error;
    }
  }

  async deleteEvent(accessToken: string, refreshToken: string, eventId: string): Promise<void> {
    const calendar = await this.buildCalendarClient(accessToken, refreshToken);

    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });

      this.logger.log(`Google Calendar event deleted: ${eventId}`);
    } catch (error: any) {
      if (this.isAuthError(error)) {
        this.logger.warn('Access token expired, retrying with refresh token');
        const newAuth = await this.refreshAuthToken(refreshToken);
        const retryCalendar = google.calendar({ version: 'v3', auth: newAuth });

        await retryCalendar.events.delete({
          calendarId: 'primary',
          eventId,
        });

        this.logger.log(`Google Calendar event deleted: ${eventId}`);
        return;
      }
      throw error;
    }
  }

  private async buildCalendarClient(accessToken: string, refreshToken: string) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.FRONTEND_URL}/api/auth/callback/google`,
    );

    auth.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return google.calendar({ version: 'v3', auth });
  }

  private async refreshAuthToken(refreshToken: string) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.FRONTEND_URL}/api/auth/callback/google`,
    );

    auth.setCredentials({ refresh_token: refreshToken });

    return new Promise<typeof auth>((resolve, reject) => {
      auth.refreshAccessToken((err, tokens) => {
        if (err || !tokens) {
          reject(err || new Error('Failed to refresh token'));
          return;
        }
        auth.setCredentials(tokens);
        resolve(auth);
      });
    });
  }

  private isAuthError(error: any): boolean {
    return (
      error?.response?.status === 401 ||
      error?.response?.status === 403 ||
      error?.message?.includes('Invalid Credentials') ||
      error?.message?.includes('Token expired')
    );
  }
}

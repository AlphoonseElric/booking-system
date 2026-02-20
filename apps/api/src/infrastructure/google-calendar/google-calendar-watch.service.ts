import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import {
  ICalendarWatchService,
  WatchRegistration,
  GoogleCalendarEvent,
} from '../../domain/services/calendar-watch.service.interface';

@Injectable()
export class GoogleCalendarWatchService implements ICalendarWatchService {
  private readonly logger = new Logger(GoogleCalendarWatchService.name);

  constructor(private readonly configService: ConfigService) {}

  async watchEvents(
    refreshToken: string,
    channelId: string,
    channelToken: string,
    webhookUrl: string,
  ): Promise<WatchRegistration> {
    const calendar = this.buildCalendarClient(refreshToken);

    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: channelToken,
      },
    });

    this.logger.log(`Watch created: channel=${channelId}, expires=${response.data.expiration}`);

    return {
      channelId: response.data.id!,
      resourceId: response.data.resourceId!,
      expiration: parseInt(response.data.expiration!, 10),
    };
  }

  async stopWatch(refreshToken: string, channelId: string, resourceId: string): Promise<void> {
    const calendar = this.buildCalendarClient(refreshToken);

    await calendar.channels.stop({
      requestBody: { id: channelId, resourceId },
    });

    this.logger.log(`Watch stopped: channel=${channelId}`);
  }

  async getEvent(refreshToken: string, eventId: string): Promise<GoogleCalendarEvent | null> {
    const calendar = this.buildCalendarClient(refreshToken);

    try {
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId,
      });

      const event = response.data;

      if (event.status === 'cancelled') {
        return null;
      }

      return {
        id: event.id!,
        status: event.status ?? 'confirmed',
        title: event.summary ?? '(No title)',
        startTime: new Date(event.start?.dateTime ?? event.start?.date ?? ''),
        endTime: new Date(event.end?.dateTime ?? event.end?.date ?? ''),
      };
    } catch (err: any) {
      // 404 means the event was hard-deleted from Google Calendar
      if (err?.code === 404 || err?.status === 404) {
        return null;
      }
      throw err;
    }
  }

  private buildCalendarClient(refreshToken: string) {
    const auth = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
    );
    auth.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth });
  }
}

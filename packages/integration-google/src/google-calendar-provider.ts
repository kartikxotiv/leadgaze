/**
 * Google Calendar Provider
 * Handles Google Calendar events and Meet link generation
 */
import { calendar_v3, google } from 'googleapis';

import type {
  CancelMeetingInput,
  CreateMeetingInput,
  CreateMeetingResult,
  ICalendarProvider,
  OAuthTokens,
  UpdateMeetingInput,
  UpdateMeetingResult,
} from '@kit/integration-core';
import {
  IntegrationError,
  IntegrationErrorCode,
  isTokenExpired,
} from '@kit/integration-core';

/**
 * Google Calendar Provider implementation
 */
export class GoogleCalendarProvider implements ICalendarProvider {
  readonly provider = 'GOOGLE' as const;
  private calendar: calendar_v3.Calendar;
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private tokens: OAuthTokens;
  private onTokenRefresh?: (tokens: OAuthTokens) => Promise<void>;

  constructor(
    tokens: OAuthTokens,
    options?: {
      clientId?: string;
      clientSecret?: string;
      onTokenRefresh?: (tokens: OAuthTokens) => Promise<void>;
    },
  ) {
    this.tokens = tokens;
    this.onTokenRefresh = options?.onTokenRefresh;

    this.oauth2Client = new google.auth.OAuth2(
      options?.clientId ?? process.env.GOOGLE_CLIENT_ID,
      options?.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET,
    );

    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (isTokenExpired(this.tokens.expires_at)) {
      if (!this.tokens.refresh_token) {
        throw new IntegrationError(
          IntegrationErrorCode.TOKEN_EXPIRED,
          'Access token expired and no refresh token available',
        );
      }

      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken();

        this.tokens = {
          access_token: credentials.access_token ?? '',
          refresh_token: credentials.refresh_token ?? this.tokens.refresh_token,
          expires_at: credentials.expiry_date,
          token_type: credentials.token_type ?? 'Bearer',
        };

        this.oauth2Client.setCredentials({
          access_token: this.tokens.access_token,
          refresh_token: this.tokens.refresh_token,
          expiry_date: this.tokens.expires_at,
        });

        // Notify caller of new tokens
        if (this.onTokenRefresh) {
          await this.onTokenRefresh(this.tokens);
        }
      } catch (error) {
        throw new IntegrationError(
          IntegrationErrorCode.TOKEN_REFRESH_FAILED,
          'Failed to refresh access token',
          {
            originalError:
              error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  }

  /**
   * Convert input to Google Calendar event format
   */
  private toCalendarEvent(input: CreateMeetingInput): calendar_v3.Schema$Event {
    const event: calendar_v3.Schema$Event = {
      summary: input.title,
      description: input.description,
      start: {
        dateTime: input.start_time,
        timeZone: input.timezone,
      },
      end: {
        dateTime: input.end_time,
        timeZone: input.timezone,
      },
      attendees: input.attendees?.map((attendee) => ({
        email: attendee.email,
        displayName: attendee.display_name,
        optional: attendee.is_optional,
      })),
      conferenceData: {
        createRequest: {
          requestId: `meet_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    if (input.location) {
      event.location = input.location;
    }

    if (input.recurrence) {
      event.recurrence = this.buildRecurrenceRules(input.recurrence);
    }

    return event;
  }

  /**
   * Build Google Calendar recurrence rules
   */
  private buildRecurrenceRules(
    rule: CreateMeetingInput['recurrence'],
  ): string[] {
    if (!rule) return [];

    const rrule: string[] = [`FREQ=${rule.frequency.toUpperCase()}`];

    if (rule.interval && rule.interval > 1) {
      rrule.push(`INTERVAL=${rule.interval}`);
    }

    if (rule.count) {
      rrule.push(`COUNT=${rule.count}`);
    }

    if (rule.until) {
      const until = new Date(rule.until);
      rrule.push(
        `UNTIL=${until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      );
    }

    if (rule.by_day && rule.by_day.length > 0) {
      rrule.push(`BYDAY=${rule.by_day.join(',')}`);
    }

    return [`RRULE:${rrule.join(';')}`];
  }

  /**
   * Extract result from calendar event response
   */
  private extractResult(event: calendar_v3.Schema$Event): CreateMeetingResult {
    const conferenceData = event.conferenceData;
    const entryPoint = conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === 'video',
    );

    return {
      provider_event_id: event.id ?? '',
      provider_meeting_id: conferenceData?.conferenceId,
      meeting_url: entryPoint?.uri ?? conferenceData?.entryPoints?.[0]?.uri,
      join_url: entryPoint?.uri,
      conference_id: conferenceData?.conferenceId,
    };
  }

  /**
   * Create a calendar event with Google Meet
   */
  async createCalendarEvent(
    input: CreateMeetingInput,
  ): Promise<CreateMeetingResult> {
    await this.ensureValidToken();

    try {
      const event = this.toCalendarEvent(input);

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      });

      if (!response.data) {
        throw new IntegrationError(
          IntegrationErrorCode.PROVIDER_ERROR,
          'No data returned from Google Calendar API',
        );
      }

      return this.extractResult(response.data);
    } catch (error) {
      if (error instanceof IntegrationError) throw error;

      const gError = error as {
        code?: number;
        message?: string;
        errors?: unknown[];
      };

      if (gError.code === 401) {
        throw new IntegrationError(
          IntegrationErrorCode.TOKEN_EXPIRED,
          'Authentication failed - token may be expired',
        );
      }

      if (gError.code === 403) {
        throw new IntegrationError(
          IntegrationErrorCode.PERMISSION_DENIED,
          'Permission denied for Google Calendar',
        );
      }

      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to create calendar event',
        { originalError: gError.message ?? String(error) },
      );
    }
  }

  /**
   * Create a meeting (alias for createCalendarEvent)
   */
  async createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult> {
    return this.createCalendarEvent(input);
  }

  /**
   * Update a calendar event
   */
  async updateCalendarEvent(
    input: UpdateMeetingInput,
  ): Promise<UpdateMeetingResult> {
    await this.ensureValidToken();

    try {
      const updateData: calendar_v3.Schema$Event = {};

      if (input.title) updateData.summary = input.title;
      if (input.description) updateData.description = input.description;
      if (input.location) updateData.location = input.location;

      if (input.start_time) {
        updateData.start = {
          dateTime: input.start_time,
          timeZone: input.timezone ?? 'UTC',
        };
      }

      if (input.end_time) {
        updateData.end = {
          dateTime: input.end_time,
          timeZone: input.timezone ?? 'UTC',
        };
      }

      if (input.attendees) {
        updateData.attendees = input.attendees.map((attendee) => ({
          email: attendee.email,
          displayName: attendee.display_name,
          optional: attendee.is_optional,
        }));
      }

      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: input.provider_event_id,
        requestBody: updateData,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      });

      if (!response.data) {
        throw new IntegrationError(
          IntegrationErrorCode.PROVIDER_ERROR,
          'No data returned from Google Calendar API',
        );
      }

      const entryPoint = response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video',
      );

      return {
        provider_event_id: response.data.id ?? input.provider_event_id,
        meeting_url: entryPoint?.uri,
      };
    } catch (error) {
      if (error instanceof IntegrationError) throw error;

      const gError = error as { code?: number; message?: string };

      if (gError.code === 404) {
        throw new IntegrationError(
          IntegrationErrorCode.NOT_FOUND,
          'Calendar event not found',
        );
      }

      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to update calendar event',
        { originalError: gError.message ?? String(error) },
      );
    }
  }

  /**
   * Update a meeting (alias for updateCalendarEvent)
   */
  async updateMeeting(input: UpdateMeetingInput): Promise<UpdateMeetingResult> {
    return this.updateCalendarEvent(input);
  }

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(providerEventId: string): Promise<void> {
    await this.ensureValidToken();

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: providerEventId,
        sendUpdates: 'all',
      });
    } catch (error) {
      const gError = error as { code?: number; message?: string };

      if (gError.code === 404) {
        // Event already deleted, no error
        return;
      }

      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to delete calendar event',
        { originalError: gError.message ?? String(error) },
      );
    }
  }

  /**
   * Cancel a meeting (alias for deleteCalendarEvent with options)
   */
  async cancelMeeting(input: CancelMeetingInput): Promise<void> {
    // Note: Google Calendar doesn't have a separate "cancel" - we delete the event
    // In the future, we could update status to 'cancelled' instead
    return this.deleteCalendarEvent(input.provider_event_id);
  }

  /**
   * Get calendar event details
   */
  async getMeeting(
    providerEventId: string,
  ): Promise<CreateMeetingResult | null> {
    await this.ensureValidToken();

    try {
      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: providerEventId,
      });

      if (!response.data) return null;

      return this.extractResult(response.data);
    } catch (error) {
      const gError = error as { code?: number };

      if (gError.code === 404) return null;

      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to get calendar event',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get calendar events in a time range
   */
  async getCalendarEvents(
    startTime: string,
    endTime: string,
  ): Promise<CreateMeetingResult[]> {
    await this.ensureValidToken();

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime,
        timeMax: endTime,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });

      const events = response.data.items ?? [];
      return events.map((event) => this.extractResult(event));
    } catch (error) {
      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to list calendar events',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}

/**
 * Create a GoogleCalendarProvider instance
 */
export function createGoogleCalendarProvider(
  tokens: OAuthTokens,
  options?: {
    clientId?: string;
    clientSecret?: string;
    onTokenRefresh?: (tokens: OAuthTokens) => Promise<void>;
  },
): GoogleCalendarProvider {
  return new GoogleCalendarProvider(tokens, options);
}

/**
 * Zoom Meeting Provider
 * Handles Zoom meeting creation, update, and deletion
 */
import axios, { AxiosInstance } from 'axios';

import type {
  CancelMeetingInput,
  CreateMeetingInput,
  CreateMeetingResult,
  IMeetingProvider,
  OAuthTokens,
  UpdateMeetingInput,
  UpdateMeetingResult,
} from '@kit/integration-core';
import {
  IntegrationError,
  IntegrationErrorCode,
  isTokenExpired,
} from '@kit/integration-core';

const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';

/**
 * Zoom Meeting Provider implementation
 */
export class ZoomMeetingProvider implements IMeetingProvider {
  readonly provider = 'ZOOM' as const;
  private client: AxiosInstance;
  private tokens: OAuthTokens;
  private clientId?: string;
  private clientSecret?: string;
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
    this.clientId = options?.clientId ?? process.env.ZOOM_CLIENT_ID;
    this.clientSecret = options?.clientSecret ?? process.env.ZOOM_CLIENT_SECRET;
    this.onTokenRefresh = options?.onTokenRefresh;

    this.client = axios.create({
      baseURL: ZOOM_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
    });
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
        const params = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refresh_token,
        });

        const response = await axios.post(
          'https://zoom.us/oauth/token',
          params.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(
                `${this.clientId}:${this.clientSecret}`,
              ).toString('base64')}`,
            },
          },
        );

        const data = response.data;

        this.tokens = {
          access_token: data.access_token ?? '',
          refresh_token: data.refresh_token ?? this.tokens.refresh_token,
          expires_at: data.expires_in
            ? Date.now() + data.expires_in * 1000
            : undefined,
          token_type: data.token_type ?? 'Bearer',
          scopes: data.scope?.split(' '),
        };

        // Update client with new token
        this.client.defaults.headers.Authorization = `Bearer ${this.tokens.access_token}`;

        // Notify caller of new tokens
        if (this.onTokenRefresh) {
          await this.onTokenRefresh(this.tokens);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('Zoom ensureValidToken error:', errMsg);
        throw new IntegrationError(
          IntegrationErrorCode.TOKEN_REFRESH_FAILED,
          'Failed to refresh access token',
          { originalError: errMsg },
        );
      }
    }
  }

  /**
   * Convert input to Zoom meeting format
   */
  private toZoomMeeting(input: CreateMeetingInput): Record<string, unknown> {
    const startTime = new Date(input.start_time);
    const endTime = new Date(input.end_time);
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.ceil(durationMs / (1000 * 60));

    // Format start time for Zoom (yyyy-MM-ddTHH:mm:ssZ)
    const formattedStartTime = startTime
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');

    const meeting: Record<string, unknown> = {
      topic: input.title,
      type: 2, // Scheduled meeting
      start_time: formattedStartTime,
      duration: durationMinutes,
      timezone: input.timezone ?? 'UTC',
      settings: {
        join_before_host: true,
        waiting_room: false,
        mute_upon_entry: false,
        participant_video: true,
        auto_recording: 'none',
      },
    };

    if (input.description) {
      meeting.agenda = input.description;
    }

    return meeting;
  }

  /**
   * Extract result from Zoom meeting response
   */
  private extractResult(data: Record<string, unknown>): CreateMeetingResult {
    return {
      provider_event_id: String(data.id ?? ''),
      provider_meeting_id: String(data.id ?? ''),
      meeting_url: (data.join_url as string) ?? undefined,
      join_url: (data.join_url as string) ?? undefined,
      conference_id: (data.id as string) ?? undefined,
    };
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult> {
    await this.ensureValidToken();

    try {
      const meetingData = this.toZoomMeeting(input);

      const response = await this.client.post(
        '/users/me/meetings',
        meetingData,
      );

      if (!response.data) {
        throw new IntegrationError(
          IntegrationErrorCode.PROVIDER_ERROR,
          'No data returned from Zoom API',
        );
      }

      const result = this.extractResult(response.data);

      // Add invitees as meeting registrants if provided
      if (input.attendees && input.attendees.length > 0) {
        await this.addRegistrants(String(response.data.id), input.attendees);
      }

      return result;
    } catch (error) {
      if (error instanceof IntegrationError) throw error;

      const axiosError = error as {
        response?: { status?: number; data?: unknown };
        message?: string;
      };

      if (axiosError.response?.status === 401) {
        throw new IntegrationError(
          IntegrationErrorCode.TOKEN_EXPIRED,
          'Authentication failed - token may be expired',
        );
      }

      if (axiosError.response?.status === 403) {
        throw new IntegrationError(
          IntegrationErrorCode.PERMISSION_DENIED,
          'Permission denied for Zoom API',
        );
      }

      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to create Zoom meeting',
        { originalError: axiosError.message ?? String(error) },
      );
    }
  }

  /**
   * Add registrants to a Zoom meeting
   */
  private async addRegistrants(
    meetingId: string,
    attendees: CreateMeetingInput['attendees'],
  ): Promise<void> {
    if (!attendees || attendees.length === 0) return;

    try {
      for (const attendee of attendees) {
        await this.client.post(`/meetings/${meetingId}/registrants`, {
          email: attendee.email,
          first_name: attendee.display_name ?? attendee.email.split('@')[0],
        });
      }
    } catch (error) {
      // Don't throw - registrant addition failure shouldn't block meeting creation
      console.error(
        'Zoom addRegistrants error (non-fatal):',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Update a Zoom meeting
   */
  async updateMeeting(input: UpdateMeetingInput): Promise<UpdateMeetingResult> {
    await this.ensureValidToken();

    try {
      const updateData: Record<string, unknown> = {};

      if (input.title) updateData.topic = input.title;
      if (input.description) updateData.agenda = input.description;
      if (input.timezone) updateData.timezone = input.timezone;

      if (input.start_time) {
        const startTime = new Date(input.start_time);
        updateData.start_time = startTime
          .toISOString()
          .replace(/\.\d{3}Z$/, 'Z');

        if (input.end_time) {
          const endTime = new Date(input.end_time);
          const durationMs = endTime.getTime() - startTime.getTime();
          updateData.duration = Math.ceil(durationMs / (1000 * 60));
        }
      }

      await this.client.patch(
        `/meetings/${input.provider_event_id}`,
        updateData,
      );

      return {
        provider_event_id: input.provider_event_id,
      };
    } catch (error) {
      if (error instanceof IntegrationError) throw error;

      const axiosError = error as {
        response?: { status?: number };
        message?: string;
      };

      if (axiosError.response?.status === 404) {
        throw new IntegrationError(
          IntegrationErrorCode.NOT_FOUND,
          'Zoom meeting not found',
        );
      }

      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to update Zoom meeting',
        { originalError: axiosError.message ?? String(error) },
      );
    }
  }

  /**
   * Cancel/delete a Zoom meeting
   */
  async cancelMeeting(input: CancelMeetingInput): Promise<void> {
    await this.ensureValidToken();

    try {
      await this.client.delete(`/meetings/${input.provider_event_id}`);
    } catch (error) {
      const axiosError = error as { response?: { status?: number } };

      if (axiosError.response?.status === 404) {
        // Meeting already deleted, no error
        return;
      }

      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to delete Zoom meeting',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get Zoom meeting details
   */
  async getMeeting(
    providerEventId: string,
  ): Promise<CreateMeetingResult | null> {
    await this.ensureValidToken();

    try {
      const response = await this.client.get(`/meetings/${providerEventId}`);

      if (!response.data) return null;

      return this.extractResult(response.data);
    } catch (error) {
      const axiosError = error as { response?: { status?: number } };

      if (axiosError.response?.status === 404) return null;

      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to get Zoom meeting',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}

/**
 * Create a ZoomMeetingProvider instance
 */
export function createZoomMeetingProvider(
  tokens: OAuthTokens,
  options?: {
    clientId?: string;
    clientSecret?: string;
    onTokenRefresh?: (tokens: OAuthTokens) => Promise<void>;
  },
): ZoomMeetingProvider {
  return new ZoomMeetingProvider(tokens, options);
}

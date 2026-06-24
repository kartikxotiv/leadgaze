/**
 * Google OAuth Provider
 * Handles OAuth flow for Google Calendar/Meet integration
 */
import { google } from 'googleapis';

import type {
  GenerateAuthUrlInput,
  IOAuthProvider,
  OAuthConfig,
  OAuthTokens,
  OAuthUserInfo,
} from '@kit/integration-core';
import { IntegrationError, IntegrationErrorCode } from '@kit/integration-core';

/**
 * Default scopes for Google Calendar/Meet integration
 */
export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Google OAuth Provider implementation
 */
export class GoogleOAuthProvider implements IOAuthProvider {
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.oauth2Client = new google.auth.OAuth2(
      config.client_id,
      config.client_secret,
      config.redirect_uri,
    );
  }

  /**
   * Generate authorization URL for Google OAuth
   */
  generateAuthUrl(input: GenerateAuthUrlInput): string {
    const scopes = input.scopes ?? this.config.scopes ?? GOOGLE_CALENDAR_SCOPES;

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: input.state,
      prompt: 'consent',
      include_granted_scopes: true,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      return {
        access_token: tokens.access_token ?? '',
        refresh_token: tokens.refresh_token ?? undefined,
        expires_at: tokens.expiry_date,
        token_type: tokens.token_type ?? 'Bearer',
        scopes: tokens.scope?.split(' '),
      };
    } catch (error) {
      throw new IntegrationError(
        IntegrationErrorCode.AUTH_FAILED,
        'Failed to exchange authorization code',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        access_token: credentials.access_token ?? '',
        refresh_token: credentials.refresh_token ?? refreshToken,
        expires_at: credentials.expiry_date,
        token_type: credentials.token_type ?? 'Bearer',
        scopes: credentials.scope?.split(' '),
      };
    } catch (error) {
      throw new IntegrationError(
        IntegrationErrorCode.TOKEN_REFRESH_FAILED,
        'Failed to refresh access token',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Revoke tokens
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await this.oauth2Client.revokeToken(token);
    } catch (error) {
      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to revoke token',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const oauth2 = google.oauth2({ auth: this.oauth2Client, version: 'v2' });
      const { data } = await oauth2.userinfo.get();

      if (!data.email) {
        throw new IntegrationError(
          IntegrationErrorCode.PROVIDER_ERROR,
          'No email found in user info',
        );
      }

      return {
        id: data.id ?? '',
        email: data.email,
        name: data.name ?? undefined,
        picture: data.picture ?? undefined,
      };
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to get user info',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}

/**
 * Create a GoogleOAuthProvider instance
 */
export function createGoogleOAuthProvider(
  config: OAuthConfig,
): GoogleOAuthProvider {
  return new GoogleOAuthProvider(config);
}

/**
 * Zoom OAuth Provider
 * Handles OAuth flow for Zoom integration
 */
import axios from 'axios';

import type {
  GenerateAuthUrlInput,
  IOAuthProvider,
  OAuthConfig,
  OAuthTokens,
  OAuthUserInfo,
} from '@kit/integration-core';
import { IntegrationError, IntegrationErrorCode } from '@kit/integration-core';

/**
 * Default scopes for Zoom integration
 */
export const ZOOM_SCOPES = [
  'meeting:read:meeting',
  'meeting:write:meeting',
  'user:read:user',
  'user:read:email',
];

const ZOOM_AUTH_URL = 'https://zoom.us/oauth/authorize';
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';
const ZOOM_REVOKE_URL = 'https://zoom.us/oauth/revoke';
const ZOOM_API_BASE_URL = 'https://api.zoom.us/v2';

/**
 * Zoom OAuth Provider implementation
 */
export class ZoomOAuthProvider implements IOAuthProvider {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  /**
   * Generate authorization URL for Zoom OAuth
   */
  generateAuthUrl(input: GenerateAuthUrlInput): string {
    const scopes = input.scopes ?? this.config.scopes ?? ZOOM_SCOPES;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.client_id,
      redirect_uri: this.config.redirect_uri,
      scope: scopes.join(' '),
      state: input.state,
    });

    return `${ZOOM_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirect_uri,
      });

      const response = await axios.post(ZOOM_TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${this.config.client_id}:${this.config.client_secret}`,
          ).toString('base64')}`,
        },
      });

      const data = response.data;

      return {
        access_token: data.access_token ?? '',
        refresh_token: data.refresh_token ?? undefined,
        expires_at: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined,
        token_type: data.token_type ?? 'Bearer',
        scopes: data.scope?.split(' '),
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Zoom exchangeCode error:', errMsg);
      throw new IntegrationError(
        IntegrationErrorCode.AUTH_FAILED,
        'Failed to exchange authorization code',
        { originalError: errMsg },
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const response = await axios.post(ZOOM_TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${this.config.client_id}:${this.config.client_secret}`,
          ).toString('base64')}`,
        },
      });

      const data = response.data;

      return {
        access_token: data.access_token ?? '',
        refresh_token: data.refresh_token ?? refreshToken,
        expires_at: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined,
        token_type: data.token_type ?? 'Bearer',
        scopes: data.scope?.split(' '),
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Zoom refreshToken error:', errMsg);
      throw new IntegrationError(
        IntegrationErrorCode.TOKEN_REFRESH_FAILED,
        'Failed to refresh access token',
        { originalError: errMsg },
      );
    }
  }

  /**
   * Revoke tokens
   */
  async revokeToken(token: string): Promise<void> {
    try {
      const params = new URLSearchParams({ token });

      await axios.post(ZOOM_REVOKE_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${this.config.client_id}:${this.config.client_secret}`,
          ).toString('base64')}`,
        },
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Zoom revokeToken error:', errMsg);
      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to revoke token',
        { originalError: errMsg },
      );
    }
  }

  /**
   * Get user info from Zoom
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    try {
      const response = await axios.get(`${ZOOM_API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = response.data;

      if (!data.email) {
        throw new IntegrationError(
          IntegrationErrorCode.PROVIDER_ERROR,
          'No email found in user info',
        );
      }

      return {
        id: data.id ?? '',
        email: data.email,
        name:
          `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() ||
          undefined,
        picture: data.pic_url ?? undefined,
      };
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Zoom getUserInfo error:', errMsg);
      throw new IntegrationError(
        IntegrationErrorCode.PROVIDER_ERROR,
        'Failed to get user info',
        { originalError: errMsg },
      );
    }
  }
}

/**
 * Create a ZoomOAuthProvider instance
 */
export function createZoomOAuthProvider(
  config: OAuthConfig,
): ZoomOAuthProvider {
  return new ZoomOAuthProvider(config);
}

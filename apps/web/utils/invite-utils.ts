/**
 * Utility functions for handling workspace invitations
 */

export interface InviteURLParams {
  token: string;
}

/**
 * Generate invite URL from token
 */
export const generateInviteURL = (token: string): string => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/invite?token=${token}`;
};

/**
 * Extract token from URL
 */
export const getInviteTokenFromURL = (url: string | null): string | null => {
  if (!url) return null;

  const params = new URLSearchParams(new URL(url, 'http://localhost').search);
  return params.get('token');
};

/**
 * Extract invite token from search params (client-side)
 */
export const getInviteTokenFromSearchParams = (
  searchParams: URLSearchParams | Record<string, string>,
): string | null => {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get('token');
  }
  return (searchParams as Record<string, string>).token || null;
};

/**
 * Check if user came from invite link
 */
export const isUserFromInvite = (
  searchParams: URLSearchParams | Record<string, string> | null,
): boolean => {
  if (!searchParams) return false;
  const token = getInviteTokenFromSearchParams(searchParams);
  return !!token;
};

/**
 * Format invitation expiry time
 */
export const formatInviteExpiry = (expiresAt: string | Date): string => {
  const date = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysLeft <= 0) return 'Expired';
  if (daysLeft === 1) return 'Expires tomorrow';
  return `Expires in ${daysLeft} days`;
};

/**
 * Check if invitation token is expired
 */
export const isInviteExpired = (expiresAt: string | Date): boolean => {
  return new Date(expiresAt) < new Date();
};

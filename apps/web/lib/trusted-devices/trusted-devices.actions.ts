'use server';

import { cookies, headers } from 'next/headers';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

const TRUSTED_DEVICE_COOKIE = 'lg_trusted_device';
const TRUSTED_DEVICE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Parse basic browser and OS info from a user-agent string.
 */
function parseUserAgent(ua: string): {
  browser: string;
  os: string;
  deviceName: string;
} {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect browser
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os, deviceName: `${browser} on ${os}` };
}

/**
 * Create a new trusted device for the current user.
 * Called after successful MFA verification when user opts to trust the device.
 */
export async function createTrustedDevice(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = getSupabaseServerClient();
    const { data: claims } = await client.auth.getClaims();

    if (!claims?.claims) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = claims.claims.sub;

    // Get request headers for user agent and IP
    const headersList = await headers();
    const userAgent = headersList.get('user-agent') ?? 'Unknown';
    const ipAddress =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      headersList.get('x-real-ip') ??
      'Unknown';

    const { browser, os, deviceName } = parseUserAgent(userAgent);

    // Generate a secure random token
    const deviceToken = crypto.randomUUID() + '-' + crypto.randomUUID();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRUSTED_DEVICE_MAX_AGE * 1000);

    // Insert into database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any)
      .schema('core')
      .from('trusted_devices')
      .insert({
        user_id: userId,
        device_token: deviceToken,
        device_name: deviceName,
        browser,
        os,
        ip_address: ipAddress,
        expires_at: expiresAt.toISOString(),
        last_used_at: now.toISOString(),
      });

    if (error) {
      console.error('Error creating trusted device:', error);
      return { success: false, error: 'Failed to create trusted device' };
    }

    // Set HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(TRUSTED_DEVICE_COOKIE, deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: TRUSTED_DEVICE_MAX_AGE,
      path: '/',
    });

    return { success: true };
  } catch (err) {
    console.error('createTrustedDevice error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all trusted devices for the current user.
 */
export async function getTrustedDevices(): Promise<{
  success: boolean;
  data?: Array<{
    id: string;
    device_name: string | null;
    browser: string | null;
    os: string | null;
    ip_address: string | null;
    expires_at: string;
    last_used_at: string | null;
    created_at: string | null;
  }>;
  error?: string;
}> {
  try {
    const client = getSupabaseServerClient();
    const { data: claims } = await client.auth.getClaims();

    if (!claims?.claims) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = claims.claims.sub;
    const now = new Date().toISOString();

    // Clean up expired devices first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (client as any)
      .schema('core')
      .from('trusted_devices')
      .delete()
      .eq('user_id', userId)
      .lt('expires_at', now);

    // Fetch active devices
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any)
      .schema('core')
      .from('trusted_devices')
      .select(
        'id, device_name, browser, os, ip_address, expires_at, last_used_at, created_at',
      )
      .eq('user_id', userId)
      .gte('expires_at', now)
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('Error fetching trusted devices:', error);
      return { success: false, error: 'Failed to fetch trusted devices' };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error('getTrustedDevices error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a specific trusted device.
 * If the deleted device matches the current cookie, clear the cookie.
 */
export async function deleteTrustedDevice(deviceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = getSupabaseServerClient();
    const { data: claims } = await client.auth.getClaims();

    if (!claims?.claims) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = claims.claims.sub;

    // Get the device token before deleting (to check if it's the current device)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: device } = await (client as any)
      .schema('core')
      .from('trusted_devices')
      .select('device_token')
      .eq('id', deviceId)
      .eq('user_id', userId)
      .single();

    // Delete the device
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any)
      .schema('core')
      .from('trusted_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting trusted device:', error);
      return { success: false, error: 'Failed to delete trusted device' };
    }

    // If the deleted device is the current one, clear the cookie
    if (device?.device_token) {
      const cookieStore = await cookies();
      const currentToken = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value;

      if (currentToken === device.device_token) {
        cookieStore.delete(TRUSTED_DEVICE_COOKIE);
      }
    }

    return { success: true };
  } catch (err) {
    console.error('deleteTrustedDevice error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete all trusted devices for the current user.
 * Also clears the trusted device cookie.
 */
export async function deleteAllTrustedDevices(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const client = getSupabaseServerClient();
    const { data: claims } = await client.auth.getClaims();

    if (!claims?.claims) {
      return { success: false, error: 'Not authenticated' };
    }

    const userId = claims.claims.sub;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (client as any)
      .schema('core')
      .from('trusted_devices')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting all trusted devices:', error);
      return { success: false, error: 'Failed to delete all trusted devices' };
    }

    // Clear the cookie
    const cookieStore = await cookies();
    cookieStore.delete(TRUSTED_DEVICE_COOKIE);

    return { success: true };
  } catch (err) {
    console.error('deleteAllTrustedDevices error:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

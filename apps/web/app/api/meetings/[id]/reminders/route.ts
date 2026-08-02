import { NextRequest } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';

import { 
  getMeetingReminders,
  createMeetingReminder 
} from './controller';

/**
 * GET /api/meetings/{id}/reminders
 * 
 * Get reminders for a specific meeting.
 * Replaces direct Supabase calls from frontend.
 */
export const GET = enhanceRouteHandler(getMeetingReminders, {
  auth: true,
});

/**
 * POST /api/meetings/{id}/reminders
 * 
 * Create a new reminder for a meeting.
 */
export const POST = enhanceRouteHandler(createMeetingReminder, {
  auth: true,
});
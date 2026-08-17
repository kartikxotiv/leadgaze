import { NextRequest } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteMeetingReminder } from './controller';

/**
 * DELETE /api/meetings/reminders/{id}
 * 
 * Delete a specific meeting reminder.
 */
export const DELETE = enhanceRouteHandler(deleteMeetingReminder, {
  auth: true,
});
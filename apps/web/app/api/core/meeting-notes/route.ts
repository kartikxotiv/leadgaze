import {
  createMeetingNoteController,
  deleteMeetingNoteController,
  getMeetingNotesController,
  updateMeetingNoteController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getMeetingNotesController, {
  auth: false,
});
export const POST = enhanceRouteHandler(createMeetingNoteController, {
  auth: false,
});
export const PATCH = enhanceRouteHandler(updateMeetingNoteController, {
  auth: false,
});
export const DELETE = enhanceRouteHandler(deleteMeetingNoteController, {
  auth: false,
});

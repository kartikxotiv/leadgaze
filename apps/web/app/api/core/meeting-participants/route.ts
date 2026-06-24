import {
  addMeetingParticipantController,
  getMeetingParticipantsController,
  updateMeetingParticipantController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getMeetingParticipantsController, {
  auth: false,
});
export const POST = enhanceRouteHandler(addMeetingParticipantController, {
  auth: false,
});
export const PATCH = enhanceRouteHandler(updateMeetingParticipantController, {
  auth: false,
});

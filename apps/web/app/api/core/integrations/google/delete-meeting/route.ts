import { deleteGoogleMeetingController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(deleteGoogleMeetingController, {
  auth: false,
});

import { updateGoogleMeetingController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(updateGoogleMeetingController, {
  auth: false,
});

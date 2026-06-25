import { createGoogleMeetingController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(createGoogleMeetingController, {
  auth: false,
});

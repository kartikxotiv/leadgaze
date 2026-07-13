import { createZoomMeetingController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(createZoomMeetingController, {
  auth: false,
});

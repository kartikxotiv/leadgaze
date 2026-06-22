import { updateZoomMeetingController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(updateZoomMeetingController, {
  auth: false,
});

import { deleteZoomMeetingController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(deleteZoomMeetingController, {
  auth: false,
});

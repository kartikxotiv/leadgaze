import {
  createMeetingController,
  deleteMeetingController,
  getMeetingsController,
  updateMeetingController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getMeetingsController, { auth: false });
export const POST = enhanceRouteHandler(createMeetingController, {
  auth: false,
});
export const PATCH = enhanceRouteHandler(updateMeetingController, {
  auth: false,
});
export const DELETE = enhanceRouteHandler(deleteMeetingController, {
  auth: false,
});
// import { createMeetingController, deleteMeetingController, getMeetingsController, updateMeetingController } from '@kit/core/apis';
// import { enhanceRouteHandler } from '@kit/next/routes';

// export const GET = enhanceRouteHandler(getMeetingsController, { auth: false });
// export const POST = enhanceRouteHandler(createMeetingController, { auth: false });
// export const PATCH = enhanceRouteHandler(updateMeetingController, { auth: false });
// export const DELETE = enhanceRouteHandler(deleteMeetingController, { auth: false });

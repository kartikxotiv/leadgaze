import { createRoundController, deleteRoundController, getRoundsController, updateRoundController } from '@kit/fund-raise';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getRoundsController, { auth: false });
export const POST = enhanceRouteHandler(createRoundController, { auth: false });
export const PATCH = enhanceRouteHandler(updateRoundController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteRoundController, { auth: false });

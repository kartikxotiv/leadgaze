import { enhanceRouteHandler } from '@kit/next/routes';

import { checkInController } from '../controller';

export const POST = enhanceRouteHandler(checkInController);

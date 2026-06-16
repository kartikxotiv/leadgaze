import { enhanceRouteHandler } from '@kit/next/routes';

import { checkOutController } from '../controller';

export const POST = enhanceRouteHandler(checkOutController);

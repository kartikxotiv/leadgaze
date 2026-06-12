import { enhanceRouteHandler } from '@kit/next/routes';

import { contextController } from '../controller';

export const GET = enhanceRouteHandler(contextController);

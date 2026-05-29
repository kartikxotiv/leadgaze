import { enhanceRouteHandler } from '@kit/next/routes';

import { getMyRbacController } from '../controller';

export const GET = enhanceRouteHandler(getMyRbacController);


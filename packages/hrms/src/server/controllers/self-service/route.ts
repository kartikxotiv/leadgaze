import { enhanceRouteHandler } from '@kit/next/routes';

import { getSelfServiceDashboardController } from './controller';

export const dynamic = 'force-dynamic';

export const GET = enhanceRouteHandler(getSelfServiceDashboardController);

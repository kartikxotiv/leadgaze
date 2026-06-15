import { enhanceRouteHandler } from '@kit/next/routes';

import { listSupportSystemDashboardController } from './controller';

export const dynamic = 'force-dynamic';

export const GET = enhanceRouteHandler(listSupportSystemDashboardController);

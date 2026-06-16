import { enhanceRouteHandler } from '@kit/next/routes';
import { getDashboardStatsController } from './controller';

export const GET = enhanceRouteHandler(getDashboardStatsController);

export const dynamic = 'force-dynamic';

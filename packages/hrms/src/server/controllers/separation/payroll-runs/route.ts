import { enhanceRouteHandler } from '@kit/next/routes';

import { listPayrollRunsController } from '../controller';

export const GET = enhanceRouteHandler(listPayrollRunsController);

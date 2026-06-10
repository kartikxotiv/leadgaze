import { enhanceRouteHandler } from '@kit/next/routes';

import { approvePayrollRunController } from '../../controller';

export const POST = enhanceRouteHandler(approvePayrollRunController);

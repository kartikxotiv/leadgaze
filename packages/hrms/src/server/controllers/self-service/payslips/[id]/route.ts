import { enhanceRouteHandler } from '@kit/next/routes';

import { getSelfServicePayslipController } from '../../controller';

export const GET = enhanceRouteHandler(getSelfServicePayslipController);

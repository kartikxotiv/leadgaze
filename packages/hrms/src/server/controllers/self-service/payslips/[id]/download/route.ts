import { enhanceRouteHandler } from '@kit/next/routes';

import { downloadSelfServicePayslipController } from '../../../controller';

export const GET = enhanceRouteHandler(downloadSelfServicePayslipController);

import { enhanceRouteHandler } from '@kit/next/routes';
import { payslipController } from './controller';

export const GET = enhanceRouteHandler(payslipController.list);

/* eslint-disable @typescript-eslint/no-explicit-any */
import { enhanceRouteHandler } from '@kit/next/routes';

import { payslipController } from '../../controller';

export const GET = enhanceRouteHandler((ctx) =>
  payslipController.listComponents({ ...ctx, params: ctx.params as any }),
);

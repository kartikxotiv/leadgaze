import { enhanceRouteHandler } from '@kit/next/routes';

import { getBillingInvoices } from './controller';

export const GET = enhanceRouteHandler(getBillingInvoices, { auth: true });

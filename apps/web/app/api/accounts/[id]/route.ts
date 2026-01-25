import { enhanceRouteHandler } from '@kit/next/routes';

import { getAccountById, updateAccount } from './controller';

export const GET = enhanceRouteHandler(getAccountById, { auth: false });
export const PATCH = enhanceRouteHandler(updateAccount, { auth: false });

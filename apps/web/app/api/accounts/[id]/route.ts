import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteAccount, getAccountById, updateAccount } from './controller';

export const GET = enhanceRouteHandler(getAccountById, { auth: false });
export const PATCH = enhanceRouteHandler(updateAccount, { auth: false });
export const DELETE = enhanceRouteHandler(deleteAccount, { auth: false });

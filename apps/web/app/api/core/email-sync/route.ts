import { syncCoreEmailAccountsController } from '@kit/core/email-sync-api';
import { enhanceRouteHandler } from '@kit/next/routes';

export const POST = enhanceRouteHandler(syncCoreEmailAccountsController, { auth: false });

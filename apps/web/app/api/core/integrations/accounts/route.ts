import {
  deleteIntegrationAccountController,
  getIntegrationAccountsController,
} from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getIntegrationAccountsController, {
  auth: false,
});
export const DELETE = enhanceRouteHandler(deleteIntegrationAccountController, {
  auth: false,
});

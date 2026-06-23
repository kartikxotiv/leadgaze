import { enhanceRouteHandler } from '@kit/next/routes';

import {
  getWorkspaceCurrencies,
  addWorkspaceCurrency,
} from './controller';

export const GET = enhanceRouteHandler(getWorkspaceCurrencies, {
  auth: false,
});

export const POST = enhanceRouteHandler(addWorkspaceCurrency, {
  auth: false,
});

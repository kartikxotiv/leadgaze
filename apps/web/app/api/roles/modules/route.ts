import { enhanceRouteHandler } from '@kit/next/routes';

import { getModulesWithFeatures } from '../controller';

export const GET = enhanceRouteHandler(getModulesWithFeatures, {
  auth: false,
});

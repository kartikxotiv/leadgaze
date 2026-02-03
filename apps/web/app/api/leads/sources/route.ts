import { enhanceRouteHandler } from '@kit/next/routes';

import { getLeadSources, createLeadSource } from '../controller';

export const GET = enhanceRouteHandler(getLeadSources, {
  auth: false,
});

export const POST = enhanceRouteHandler(createLeadSource, {
  auth: true,
});

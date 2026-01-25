import { enhanceRouteHandler } from '@kit/next/routes';

import { getOpportunityById, updateOpportunity } from './controller';

export const GET = enhanceRouteHandler(getOpportunityById, { auth: false });
export const PATCH = enhanceRouteHandler(updateOpportunity, { auth: false });

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteOpportunity,
  getOpportunityById,
  updateOpportunity,
} from './controller';

export const GET = enhanceRouteHandler(getOpportunityById, { auth: false });
export const PATCH = enhanceRouteHandler(updateOpportunity, { auth: false });
export const DELETE = enhanceRouteHandler(deleteOpportunity, { auth: false });

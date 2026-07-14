import { NextRequest } from 'next/server';

import {
  updateOpportunityStage,
  deleteOpportunityStage,
} from '../../controller';

export const PATCH = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return updateOpportunityStage({ request, params });
};

export const DELETE = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return deleteOpportunityStage({ request, params });
};

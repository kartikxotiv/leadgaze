import { NextRequest } from 'next/server';

import { reassignOpportunityStage } from '../../../controller';

export const PATCH = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return reassignOpportunityStage({ request, params });
};

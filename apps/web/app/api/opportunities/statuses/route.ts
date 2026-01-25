import { NextRequest } from 'next/server';

import { getOpportunityStages } from '../controller';

export const GET = (request: NextRequest) => {
  return getOpportunityStages({ request });
};

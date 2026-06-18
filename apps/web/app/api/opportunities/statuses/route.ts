import { NextRequest } from 'next/server';

import {
  getOpportunityStages,
  createOpportunityStage,
} from '../controller';

export const GET = (request: NextRequest) => {
  return getOpportunityStages({ request });
};

export const POST = (request: NextRequest) => {
  return createOpportunityStage({ request });
};

import { NextRequest } from 'next/server';

import { getAffectedOpportunities } from '../../../controller';

export const GET = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return getAffectedOpportunities({ request, params });
};

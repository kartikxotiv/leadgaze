import { NextRequest } from 'next/server';

import { getAffectedLeads } from '../../../controller';

export const GET = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return getAffectedLeads({ request, params });
};

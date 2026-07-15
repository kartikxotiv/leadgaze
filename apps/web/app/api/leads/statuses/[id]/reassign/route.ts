import { NextRequest } from 'next/server';

import { reassignLeadStatus } from '../../../controller';

export const PATCH = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return reassignLeadStatus({ request, params });
};

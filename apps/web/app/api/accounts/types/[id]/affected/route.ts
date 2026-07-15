import { NextRequest } from 'next/server';

import { getAffectedAccounts } from '../../../controller';

export const GET = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return getAffectedAccounts({ request, params });
};

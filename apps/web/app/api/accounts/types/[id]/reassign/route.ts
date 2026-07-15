import { NextRequest } from 'next/server';

import { reassignAccountType } from '../../../controller';

export const PATCH = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return reassignAccountType({ request, params });
};

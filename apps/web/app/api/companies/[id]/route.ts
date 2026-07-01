import { NextRequest } from 'next/server';

import { updateCompany } from '../controller';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateCompany({ request, params });
}

import { NextRequest } from 'next/server';

import { updateCompany } from '../controller';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return updateCompany({ request, params: resolvedParams });
}

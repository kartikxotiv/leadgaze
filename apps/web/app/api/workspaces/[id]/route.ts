import { NextRequest } from 'next/server';
import { updateWorkspace } from '../controller';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateWorkspace({ request, params });
}

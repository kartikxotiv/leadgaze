import { NextRequest } from 'next/server';
import { updateWorkspace } from '../controller';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  return updateWorkspace({ request, params: resolvedParams });
}

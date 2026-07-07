import { NextRequest } from 'next/server';

import {
  updateWorkspaceCurrency,
  deleteWorkspaceCurrency,
} from '../controller';

export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const resolvedParams = await params;
  return updateWorkspaceCurrency({ request, params: resolvedParams });
};

export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const resolvedParams = await params;
  return deleteWorkspaceCurrency({ params: resolvedParams });
};

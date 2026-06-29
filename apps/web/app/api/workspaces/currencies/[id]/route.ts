import { NextRequest } from 'next/server';

import {
  updateWorkspaceCurrency,
  deleteWorkspaceCurrency,
} from '../controller';

export const PATCH = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return updateWorkspaceCurrency({ request, params });
};

export const DELETE = (
  request: NextRequest,
  { params }: { params: { id: string } },
) => {
  return deleteWorkspaceCurrency({ params });
};

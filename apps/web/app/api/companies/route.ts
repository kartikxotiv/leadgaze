import { NextRequest } from 'next/server';

import { createCompany } from './controller';

export async function POST(request: NextRequest) {
  return createCompany({ request });
}

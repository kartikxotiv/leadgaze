import { NextRequest } from 'next/server';

import { getDashboardMetrics } from './controller';

export const GET = (request: NextRequest) => {
  return getDashboardMetrics({ request });
};

import { NextRequest } from 'next/server';

import { getAuditLogs } from './controller';

export const GET = (request: NextRequest) => getAuditLogs({ request });

export const dynamic = 'force-dynamic';

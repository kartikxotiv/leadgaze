import { enhanceRouteHandler } from '@kit/next/routes';

import { createTeam, getAllTeams } from './controller';

export const GET = enhanceRouteHandler(getAllTeams, {
  auth: true,
});

export const POST = enhanceRouteHandler(createTeam, {
  auth: true,
});

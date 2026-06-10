import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createSeatAssignment,
  deleteSeatAssignment,
  getSeatAssignments,
} from './controller';

export const GET = enhanceRouteHandler(getSeatAssignments, {
  auth: true,
});

export const POST = enhanceRouteHandler(createSeatAssignment, {
  auth: true,
});

export const DELETE = enhanceRouteHandler(deleteSeatAssignment, {
  auth: true,
});

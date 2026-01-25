import { enhanceRouteHandler } from '@kit/next/routes';

import { createNote, getNotes } from './controller';

export const GET = enhanceRouteHandler(getNotes, { auth: false });
export const POST = enhanceRouteHandler(createNote, { auth: false });

import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteNote, updateNote } from '../controller';

export const PATCH = enhanceRouteHandler(updateNote, { auth: false });
export const DELETE = enhanceRouteHandler(deleteNote, { auth: false });

import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteDocument, updateDocument } from '../controller';

export const PATCH = enhanceRouteHandler(updateDocument, { auth: false });
export const DELETE = enhanceRouteHandler(deleteDocument, { auth: false });

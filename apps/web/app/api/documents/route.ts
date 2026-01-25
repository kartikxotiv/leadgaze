import { enhanceRouteHandler } from '@kit/next/routes';

import { createDocument, getDocuments } from './controller';

export const GET = enhanceRouteHandler(getDocuments, { auth: false });
export const POST = enhanceRouteHandler(createDocument, { auth: false });

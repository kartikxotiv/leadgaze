import { enhanceRouteHandler } from '@kit/next/routes';

import { deleteContact, getContactById, updateContact } from './controller';

export const GET = enhanceRouteHandler(getContactById, { auth: false });
export const PATCH = enhanceRouteHandler(updateContact, { auth: false });
export const DELETE = enhanceRouteHandler(deleteContact, { auth: false });

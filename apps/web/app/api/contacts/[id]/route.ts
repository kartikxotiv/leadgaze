import { enhanceRouteHandler } from '@kit/next/routes';

import { getContactById, updateContact } from './controller';

export const GET = enhanceRouteHandler(getContactById, { auth: false });
export const PATCH = enhanceRouteHandler(updateContact, { auth: false });

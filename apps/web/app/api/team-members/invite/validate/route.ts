import { enhanceRouteHandler } from '@kit/next/routes';

import { validateInvite } from './controller';

export const GET = enhanceRouteHandler(validateInvite, { auth: false });

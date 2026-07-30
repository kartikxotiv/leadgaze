import { enhanceRouteHandler } from '@kit/next/routes';
import { getMessages } from './controller';

export const GET = enhanceRouteHandler(getMessages);

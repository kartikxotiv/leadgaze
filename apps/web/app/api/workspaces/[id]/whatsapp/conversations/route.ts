import { enhanceRouteHandler } from '@kit/next/routes';
import { getConversations } from './controller';

export const GET = enhanceRouteHandler(getConversations);

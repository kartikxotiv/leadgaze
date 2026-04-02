import { enhanceRouteHandler } from '@kit/next/routes';
import { googleAuthCallback } from './controller';

export const dynamic = 'force-dynamic';

export const GET = enhanceRouteHandler(googleAuthCallback, {
    auth: true,
});
import { enhanceRouteHandler } from '@kit/next/routes';
import { getZapierSettings, mutateZapierSettings } from './controller';

export const GET = enhanceRouteHandler(getZapierSettings);
export const POST = enhanceRouteHandler(mutateZapierSettings);

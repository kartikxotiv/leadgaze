import { enhanceRouteHandler } from '@kit/next/routes';
import { getWhatsAppSettings, mutateWhatsAppSettings } from './controller';

export const GET = enhanceRouteHandler(getWhatsAppSettings);
export const POST = enhanceRouteHandler(mutateWhatsAppSettings);

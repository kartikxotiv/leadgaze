import { enhanceRouteHandler } from '@kit/next/routes';
import { uploadController } from './controller';

export const POST = enhanceRouteHandler(uploadController);

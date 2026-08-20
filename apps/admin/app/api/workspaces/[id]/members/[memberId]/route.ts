import { enhanceRouteHandler } from '@kit/next/routes';
import { removeWorkspaceMember } from '../../../controller';

export const DELETE = enhanceRouteHandler(removeWorkspaceMember, {
  auth: true,
});


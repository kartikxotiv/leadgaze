import { enhanceRouteHandler } from '@kit/next/routes';

import { getDepartmentOptionsController } from '../controller';

export const GET = enhanceRouteHandler(getDepartmentOptionsController);

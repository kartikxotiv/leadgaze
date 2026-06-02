import { enhanceRouteHandler } from '@kit/next/routes';

import { getEmployeeOptionsController } from '../controller';

export const dynamic = 'force-dynamic';

export const GET = enhanceRouteHandler(getEmployeeOptionsController);

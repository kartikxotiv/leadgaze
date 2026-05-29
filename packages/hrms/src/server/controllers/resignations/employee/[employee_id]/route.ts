import { enhanceRouteHandler } from '@kit/next/routes';

import { getResignationByEmployeeIdController } from '../../controller';

export const GET = enhanceRouteHandler(getResignationByEmployeeIdController);

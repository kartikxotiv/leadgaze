import { enhanceRouteHandler } from '@kit/next/routes';

import { getRecruitmentOptionsController } from '../controller';

export const GET = enhanceRouteHandler(getRecruitmentOptionsController);

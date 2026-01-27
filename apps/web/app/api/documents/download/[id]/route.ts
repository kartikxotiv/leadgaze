import { enhanceRouteHandler } from '@kit/next/routes';

import { downloadDocument } from '../../controller';

export const GET = enhanceRouteHandler(downloadDocument, { auth: false });

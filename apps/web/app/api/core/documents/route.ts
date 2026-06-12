import { deleteDocumentController, getDocumentsController, updateDocumentController, uploadDocumentController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getDocumentsController, { auth: false });
export const POST = enhanceRouteHandler(uploadDocumentController, { auth: false });
export const PATCH = enhanceRouteHandler(updateDocumentController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteDocumentController, { auth: false });

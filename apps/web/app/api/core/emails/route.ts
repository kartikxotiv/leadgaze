import { deleteEmailController, getEmailsController, sendEmailController, updateEmailController } from '@kit/core/apis';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getEmailsController, { auth: false });
export const POST = enhanceRouteHandler(sendEmailController, { auth: false });
export const PATCH = enhanceRouteHandler(updateEmailController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteEmailController, { auth: false });

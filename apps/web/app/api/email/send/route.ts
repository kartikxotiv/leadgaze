import { enhanceRouteHandler } from '@kit/next/routes';
import { sendEmail } from "./controller";

export const POST = enhanceRouteHandler(sendEmail);

import { createCommitmentController, deleteCommitmentController, getCommitmentsController, updateCommitmentController } from '@kit/fund-raise';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getCommitmentsController, { auth: false });
export const POST = enhanceRouteHandler(createCommitmentController, { auth: false });
export const PATCH = enhanceRouteHandler(updateCommitmentController, { auth: false });
export const DELETE = enhanceRouteHandler(deleteCommitmentController, { auth: false });

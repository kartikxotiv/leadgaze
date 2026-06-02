import { createPipelineStageController, deletePipelineStageController, getPipelineStagesController, updatePipelineStageController } from '@kit/fund-raise';
import { enhanceRouteHandler } from '@kit/next/routes';

export const GET = enhanceRouteHandler(getPipelineStagesController, { auth: false });
export const POST = enhanceRouteHandler(createPipelineStageController, { auth: false });
export const PATCH = enhanceRouteHandler(updatePipelineStageController, { auth: false });
export const DELETE = enhanceRouteHandler(deletePipelineStageController, { auth: false });

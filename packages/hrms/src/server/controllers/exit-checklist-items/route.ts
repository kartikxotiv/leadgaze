import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createExitChecklistItemController,
  listExitChecklistItemsController,
} from './controller';

const ExitChecklistItemCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(4000).optional().nullable(),
});

export const GET = enhanceRouteHandler(listExitChecklistItemsController);

export const POST = enhanceRouteHandler(createExitChecklistItemController, {
  schema: ExitChecklistItemCreateSchema,
});

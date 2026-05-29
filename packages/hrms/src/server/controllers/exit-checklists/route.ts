import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createExitChecklistController,
  listExitChecklistsController,
} from './controller';

const ExitChecklistCreateSchema = z.object({
  employee_id: z.string().uuid(),
  resignation_id: z.string().uuid().optional().nullable(),
  checklist_item_id: z.string().uuid().optional().nullable(),
  checklist_item_ids: z.array(z.string().uuid()).optional(),
  task_name: z.string().min(1).max(255).optional(),
  task_category: z.enum(['IT', 'ADMIN', 'HR', 'FINANCE']).optional(),
  owner_employee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  remarks: z.string().optional().nullable(),
});

export const GET = enhanceRouteHandler(listExitChecklistsController);

export const POST = enhanceRouteHandler(createExitChecklistController, {
  schema: ExitChecklistCreateSchema,
});

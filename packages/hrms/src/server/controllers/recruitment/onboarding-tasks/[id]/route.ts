import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteRecruitmentOnboardingTaskController,
  updateRecruitmentOnboardingTaskController,
} from '../../controller';
import { recruitmentOnboardingStatuses } from '~/types/recruitment.type';

const RecruitmentOnboardingTaskUpdateSchema = z.object({
  candidate_id: z.string().uuid().optional(),
  description: z.string().max(4000).optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  offer_id: z.string().uuid().optional().nullable(),
  owner_employee_id: z.string().uuid().optional().nullable(),
  status: z.enum(recruitmentOnboardingStatuses).optional(),
  title: z.string().min(2).max(200).optional(),
});

export const PATCH = enhanceRouteHandler(updateRecruitmentOnboardingTaskController, {
  schema: RecruitmentOnboardingTaskUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteRecruitmentOnboardingTaskController);

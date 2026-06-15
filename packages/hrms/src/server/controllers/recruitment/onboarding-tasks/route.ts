import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { recruitmentOnboardingStatuses } from '../../../../types/recruitment.type';
import { createRecruitmentOnboardingTaskController } from '../controller';

const RecruitmentOnboardingTaskSchema = z.object({
  candidate_id: z.string().uuid(),
  description: z.string().max(4000).optional().nullable(),
  due_date: z.string().date().optional().nullable(),
  offer_id: z.string().uuid().optional().nullable(),
  owner_employee_id: z.string().uuid().optional().nullable(),
  status: z.enum(recruitmentOnboardingStatuses),
  title: z.string().min(2).max(200),
});

export const POST = enhanceRouteHandler(
  createRecruitmentOnboardingTaskController,
  {
    schema: RecruitmentOnboardingTaskSchema,
  },
);

import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteRecruitmentOfferController,
  updateRecruitmentOfferController,
} from '../../controller';
import { recruitmentOfferStatuses } from '~/types/recruitment.type';

const RecruitmentOfferUpdateSchema = z.object({
  approved_by_employee_id: z.string().uuid().optional().nullable(),
  candidate_id: z.string().uuid().optional(),
  currency_code: z.string().length(3).optional(),
  joining_date: z.string().date().optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  offered_designation: z.string().min(2).max(200).optional(),
  salary_amount: z.number().min(0).optional(),
  status: z.enum(recruitmentOfferStatuses).optional(),
});

export const PATCH = enhanceRouteHandler(updateRecruitmentOfferController, {
  schema: RecruitmentOfferUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteRecruitmentOfferController);

import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  createRecruitmentRequisitionController,
  getRecruitmentDashboardController,
} from './controller';
import {
  recruitmentEmploymentTypes,
  recruitmentPriorities,
  recruitmentRequisitionStatuses,
} from '~/types/recruitment.type';

const RecruitmentRequisitionSchema = z.object({
  compensation_max: z.number().min(0).optional().nullable(),
  compensation_min: z.number().min(0).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  employment_type: z.enum(recruitmentEmploymentTypes),
  hiring_manager_employee_id: z.string().uuid().optional().nullable(),
  location: z.string().max(150).optional().nullable(),
  openings: z.number().int().min(1),
  owner_employee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(recruitmentPriorities),
  requested_by_employee_id: z.string().uuid().optional().nullable(),
  requisition_code: z.string().min(2).max(40),
  status: z.enum(recruitmentRequisitionStatuses),
  target_start_date: z.string().date().optional().nullable(),
  title: z.string().min(2).max(200),
});

export const GET = enhanceRouteHandler(getRecruitmentDashboardController);

export const POST = enhanceRouteHandler(createRecruitmentRequisitionController, {
  schema: RecruitmentRequisitionSchema,
});

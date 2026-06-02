import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  deleteRecruitmentRequisitionController,
  updateRecruitmentRequisitionController,
} from '../../controller';
import {
  recruitmentEmploymentTypes,
  recruitmentPriorities,
  recruitmentRequisitionStatuses,
} from '~/types/recruitment.type';

const RecruitmentRequisitionUpdateSchema = z.object({
  compensation_max: z.number().min(0).optional().nullable(),
  compensation_min: z.number().min(0).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  employment_type: z.enum(recruitmentEmploymentTypes).optional(),
  hiring_manager_employee_id: z.string().uuid().optional().nullable(),
  location: z.string().max(150).optional().nullable(),
  openings: z.number().int().min(1).optional(),
  owner_employee_id: z.string().uuid().optional().nullable(),
  priority: z.enum(recruitmentPriorities).optional(),
  requested_by_employee_id: z.string().uuid().optional().nullable(),
  requisition_code: z.string().min(2).max(40).optional(),
  status: z.enum(recruitmentRequisitionStatuses).optional(),
  target_start_date: z.string().date().optional().nullable(),
  title: z.string().min(2).max(200).optional(),
});

export const PATCH = enhanceRouteHandler(updateRecruitmentRequisitionController, {
  schema: RecruitmentRequisitionUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteRecruitmentRequisitionController);

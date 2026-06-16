import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { recruitmentCandidateStatuses } from '../../../../../types/recruitment.type';
import {
  deleteRecruitmentCandidateController,
  updateRecruitmentCandidateController,
} from '../../controller';

const RecruitmentCandidateUpdateSchema = z.object({
  applied_at: z.string().date().optional().nullable(),
  current_company: z.string().max(200).optional().nullable(),
  current_ctc: z.number().min(0).optional().nullable(),
  current_designation: z.string().max(200).optional().nullable(),
  email: z.string().email().optional(),
  expected_ctc: z.number().min(0).optional().nullable(),
  experience_years: z.number().min(0).max(60).optional().nullable(),
  full_name: z.string().min(2).max(200).optional(),
  notice_period_days: z.number().int().min(0).max(365).optional().nullable(),
  owner_employee_id: z.string().uuid().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  requisition_id: z.string().uuid().optional(),
  resume_url: z.string().url().optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  status: z.enum(recruitmentCandidateStatuses).optional(),
});

export const PATCH = enhanceRouteHandler(updateRecruitmentCandidateController, {
  schema: RecruitmentCandidateUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteRecruitmentCandidateController);

import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import {
  recruitmentInterviewRoundTypes,
  recruitmentInterviewStatuses,
} from '../../../../../types/recruitment.type';
import {
  deleteRecruitmentInterviewController,
  updateRecruitmentInterviewController,
} from '../../controller';

const RecruitmentInterviewUpdateSchema = z.object({
  candidate_id: z.string().uuid().optional(),
  duration_minutes: z.number().int().min(1).max(480).optional(),
  interviewer_employee_id: z.string().uuid().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  meeting_link: z.string().url().optional().nullable(),
  outcome: z.string().max(2000).optional().nullable(),
  round_type: z.enum(recruitmentInterviewRoundTypes).optional(),
  scheduled_at: z.string().datetime().optional(),
  status: z.enum(recruitmentInterviewStatuses).optional(),
  title: z.string().min(2).max(200).optional(),
});

export const PATCH = enhanceRouteHandler(updateRecruitmentInterviewController, {
  schema: RecruitmentInterviewUpdateSchema,
});

export const DELETE = enhanceRouteHandler(deleteRecruitmentInterviewController);

import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { createRecruitmentInterviewController } from '../controller';
import {
  recruitmentInterviewRoundTypes,
  recruitmentInterviewStatuses,
} from '~/types/recruitment.type';

const RecruitmentInterviewSchema = z.object({
  candidate_id: z.string().uuid(),
  duration_minutes: z.number().int().min(1).max(480),
  interviewer_employee_id: z.string().uuid().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  meeting_link: z.string().url().optional().nullable(),
  outcome: z.string().max(2000).optional().nullable(),
  round_type: z.enum(recruitmentInterviewRoundTypes),
  scheduled_at: z.string().datetime(),
  status: z.enum(recruitmentInterviewStatuses),
  title: z.string().min(2).max(200),
});

export const POST = enhanceRouteHandler(createRecruitmentInterviewController, {
  schema: RecruitmentInterviewSchema,
});

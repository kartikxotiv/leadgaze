import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { recruitmentFeedbackRecommendations } from '../../../../types/recruitment.type';
import { createRecruitmentFeedbackController } from '../controller';

const RecruitmentFeedbackSchema = z.object({
  concerns: z.string().max(4000).optional().nullable(),
  interviewer_employee_id: z.string().uuid().optional().nullable(),
  interview_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  recommendation: z.enum(recruitmentFeedbackRecommendations),
  strengths: z.string().max(4000).optional().nullable(),
  summary: z.string().max(4000).optional().nullable(),
});

export const POST = enhanceRouteHandler(createRecruitmentFeedbackController, {
  schema: RecruitmentFeedbackSchema,
});

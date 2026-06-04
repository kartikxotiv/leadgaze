import { z } from 'zod';

import { enhanceRouteHandler } from '@kit/next/routes';

import { createRecruitmentCandidateNoteController } from '../../../controller';

const RecruitmentCandidateNoteSchema = z.object({
  is_pinned: z.boolean().optional(),
  note: z.string().min(2).max(4000),
});

export const POST = enhanceRouteHandler(
  createRecruitmentCandidateNoteController,
  {
    schema: RecruitmentCandidateNoteSchema,
  },
);

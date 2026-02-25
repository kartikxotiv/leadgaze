import { z } from 'zod';

import { RefinedPasswordSchema, refineRepeatPassword } from './password.schema';

export const PasswordSignUpSchema = z
  .object({
    email: z.string().email(),
    password: RefinedPasswordSchema,
    repeatPassword: RefinedPasswordSchema,
    fullName: z.string().min(2).max(100),
  })
  .superRefine(refineRepeatPassword);

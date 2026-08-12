import type { Provider } from '@supabase/supabase-js';

import { z } from 'zod';

const providers: z.ZodType<Provider> = getProviders();

const AuthConfigSchema = z.object({
  captchaTokenSiteKey: z.string().optional(),
  providers: z.object({
    password: z.boolean(),
    magicLink: z.boolean(),
    oAuth: providers.array(),
  }),
});

/**
 * Admin portal uses password authentication only.
 * Admin accounts are provisioned manually — no sign-up flow.
 */
const authConfig = AuthConfigSchema.parse({
  captchaTokenSiteKey: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
  providers: {
    password: true,
    magicLink: false,
    oAuth: [] as Provider[],
  },
} satisfies z.infer<typeof AuthConfigSchema>);

export default authConfig;

function getProviders() {
  return z.enum([
    'apple', 'azure', 'bitbucket', 'discord', 'facebook', 'figma',
    'github', 'gitlab', 'google', 'kakao', 'keycloak', 'linkedin',
    'linkedin_oidc', 'notion', 'slack', 'spotify', 'twitch', 'twitter',
    'workos', 'zoom', 'fly',
  ]);
}

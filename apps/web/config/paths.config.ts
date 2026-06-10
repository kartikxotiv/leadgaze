import { z } from 'zod';

const PathsSchema = z.object({
  auth: z.object({
    signIn: z.string().min(1),
    signUp: z.string().min(1),
    verifyMfa: z.string().min(1),
    callback: z.string().min(1),
    passwordReset: z.string().min(1),
    passwordUpdate: z.string().min(1),
  }),
  app: z.object({
    home: z.string().min(1),
    profileSettings: z.string().min(1),
    workspaceSetup: z.string().min(1),
    leads: z.string().min(1),
    contacts: z.string().min(1),
    accounts: z.string().min(1),
    opportunities: z.string().min(1),
    teamMembers: z.string().min(1),
    teams: z.string().min(1),
    roles: z.string().min(1),
    auditLogs: z.string().min(1),
    workspaceSettings: z.string().min(1),
    emails: z.string().min(1),
  }),
});

const pathsConfig = PathsSchema.parse({
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    verifyMfa: '/auth/verify',
    callback: '/auth/callback',
    passwordReset: '/auth/password-reset',
    passwordUpdate: '/update-password',
  },
  app: {
    home: '/org/home',
    profileSettings: '/home/sales/settings',
    workspaceSetup: '/workspace-setup',
    leads: '/home/sales/leads',
    contacts: '/home/sales/contacts',
    accounts: '/home/sales/accounts',
    opportunities: '/home/sales/opportunities',
    teamMembers: '/home/sales/team-members',
    teams: '/home/sales/teams',
    roles: '/home/sales/roles',
    auditLogs: '/home/sales/audit-logs',
    workspaceSettings: '/home/sales/workspace-settings',
    emails: '/home/sales/emails',
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;

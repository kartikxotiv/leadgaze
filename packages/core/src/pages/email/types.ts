import type { ReactNode } from 'react';

export type CoreEmailWorkspace = {
  id: string;
  name?: string | null;
  role?: {
    role_key?: string | null;
  } | null;
};

export type CoreEmailPermissions = {
  viewInbox?: boolean;
  sendEmails?: boolean;
  manageTemplates?: boolean;
  manageVariables?: boolean;
  manageAccounts?: boolean;
};

export type CoreEmailPageProps = {
  workspace: CoreEmailWorkspace | null | undefined;
  permissions?: CoreEmailPermissions;
  googleAuthPath?: string;
  googleReturnUrl?: string;
  embedded?: boolean;
  renderEmailActions?: (email: any) => ReactNode;
};

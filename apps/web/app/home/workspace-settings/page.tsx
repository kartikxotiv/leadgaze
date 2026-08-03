'use client';

import { usePathname } from 'next/navigation';

import { CreditCard, Globe, Link2, Mail, Settings2, Video } from 'lucide-react';

import { CoreEmailSettingsPage } from '@kit/core/pages';
import { Card, CardContent } from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import OrgSubscriptionPage from '~/org/subscription/page';

import { WorkspaceLocalizationSettings } from './_components/localization-settings';
import { MeetingAccountsSettings } from './_components/meeting-accounts-settings';
import { WorkspaceGeneralSettings } from './_components/general-settings';
import { WorkspaceIntegrationsSettings } from './_components/integrations-settings';



export default function WorkspaceSettingsPage() {
  const {
    currentWorkspace: workspace,
    canAccess,
    isLoading: isRbacLoading,
  } = useRBAC();
  const canViewSettings = canAccess('settings', 'view');
  const isAdmin =
    workspace?.currentRole?.role_key === 'admin' ||
    (workspace?.currentRole?.hierarchy_level ?? 0) >= 100;
  const canViewGeneralSettings = canViewSettings && isAdmin;

  const canViewSubscription = canAccess('subscription', 'view');
  const canManageSubscription = canAccess('subscription', 'manage');
  const canManageEmail = canAccess('emails', 'manage_email');
  const canManageMeetings = 1 == 1 || canAccess('meetings', 'manage');

  const pathname = usePathname() || '';
  const isSalesModule = pathname.includes('/sales');
  const showMeetingsTab = canManageMeetings && isSalesModule;

  const defaultTab = canViewGeneralSettings
    ? 'general'
    : canViewSettings
      ? 'localization'
      : canViewSubscription
        ? 'billing'
        : showMeetingsTab
          ? 'meetings'
          : 'emails';

  if (isRbacLoading) {
    return null;
  }

  if (
    !canViewSettings &&
    !canViewSubscription &&
    !canManageEmail &&
    !canManageMeetings
  ) {
    return (
      <>
        <PageHeader
          title="Workspace"
        />
        {/* description="Manage your workspace configuration, email accounts, meeting accounts, and templates." */}
        <PageBody className="flex min-w-0 flex-1 shrink-0 flex-col">
          <Card>
            <CardContent className="text-muted-foreground p-6 text-sm">
              You do not have permission to view workspace settings.
            </CardContent>
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Workspace"
      />
      {/* description="Manage your workspace configuration, email accounts, meeting accounts, and templates." */}
      <PageBody className="sticky flex min-w-0 flex-1 shrink-0 flex-col overflow-hidden">
        <Tabs
          defaultValue={defaultTab}
          className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col space-y-6"
        >
          <TabsList className="mb-1 h-auto w-full justify-start gap-8 rounded-none border-b bg-transparent p-0">
            {canViewGeneralSettings && (
              <TabsTrigger
                value="general"
                className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
            )}
            {canViewSettings && (
              <TabsTrigger
                value="localization"
                className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
              >
                <Globe className="mr-2 h-4 w-4" />
                Localization
              </TabsTrigger>
            )}
            {canViewSubscription && (
              <TabsTrigger
                value="billing"
                className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </TabsTrigger>
            )}
            {canManageEmail && (
              <TabsTrigger
                value="emails"
                className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Accounts
              </TabsTrigger>
            )}
            {showMeetingsTab && (
              <TabsTrigger
                value="meetings"
                className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
              >
                <Video className="mr-2 h-4 w-4" />
                Meeting Accounts
              </TabsTrigger>
            )}
            {isSalesModule && (
              <TabsTrigger
                value="integrations"
                className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Integrations
              </TabsTrigger>
            )}
          </TabsList>

          {canViewGeneralSettings && workspace?.id && (
            <TabsContent
              value="general"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 overflow-y-auto pr-2 pb-6"
            >
              {/* <WorkspaceManagement currentWorkspace={workspace} /> */}
              <WorkspaceGeneralSettings workspaceId={workspace.id} />
            </TabsContent>
          )}

          {canViewSettings && workspace?.id && (
            <TabsContent
              value="localization"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 overflow-y-auto pr-2 pb-6"
            >
              <WorkspaceLocalizationSettings workspaceId={workspace.id} />
            </TabsContent>
          )}

          {canViewSubscription && (
            <TabsContent
              value="billing"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 overflow-y-auto pr-2 pb-6"
            >
              <OrgSubscriptionPage
                canManageSubscription={canManageSubscription}
              />
            </TabsContent>
          )}

          {canManageEmail && (
            <TabsContent
              value="emails"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 overflow-y-auto pr-2 pb-6"
            >
              {/* {shouldUseWebEmailSettings ? (
              <EmailAccountsSettings workspace={workspace} />
            ) : ( */}
              <CoreEmailSettingsPage
                workspace={workspace}
                embedded
                googleAuthPath="/api/email/google/auth"
                googleReturnUrl={pathname || '/home/workspace-settings'}
                permissions={{
                  manageAccounts: canManageEmail,
                  manageTemplates: canManageEmail,
                  manageVariables: canManageEmail,
                }}
              />
              {/* )} */}
            </TabsContent>
          )}

          {showMeetingsTab && (
            <TabsContent
              value="meetings"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 overflow-y-auto pr-2 pb-6"
            >
              <MeetingAccountsSettings workspace={workspace} />
            </TabsContent>
          )}

          {isSalesModule && (
            <TabsContent
              value="integrations"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0 overflow-y-auto pr-2 pb-6"
            >
              <WorkspaceIntegrationsSettings workspace={workspace} />
            </TabsContent>
          )}
        </Tabs>
      </PageBody>
    </>
  );
}

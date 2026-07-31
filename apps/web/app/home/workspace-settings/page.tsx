'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Building2, CreditCard, Globe, Mail, Settings2, Video, Link2, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailSettingsPage } from '@kit/core/pages';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import OrgSubscriptionPage from '~/org/subscription/page';

import { WorkspaceLocalizationSettings } from './_components/localization-settings';
import { MeetingAccountsSettings } from './_components/meeting-accounts-settings';
import { WorkspaceGeneralSettings } from './_components/general-settings';
import { WorkspaceIntegrationsSettings } from './_components/integrations-settings';

type WorkspaceSummary = {
  id: string;
  name: string;
};

type WorkspaceMembershipRow = {
  workspaces: WorkspaceSummary | null;
};

function WorkspaceManagement({
  currentWorkspace,
}: {
  currentWorkspace: WorkspaceSummary | null;
}) {
  const { workspaces, selectWorkspace } = useRBAC();
  const router = useRouter();

  const handleWorkspaceChange = (workspaceId: string) => {
    selectWorkspace(workspaceId);
    toast.success('Workspace switched successfully');
    setTimeout(() => {
      window.location.assign('/home');
    }, 500);
  };

  if (!currentWorkspace || workspaces.length <= 1) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="p-4 pb-3">
        <CardTitle className="mb-0">Workspace Management</CardTitle>
        <CardDescription>
          Select and manage your active workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[300px] justify-between dark:text-white">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">{currentWorkspace.name}</span>
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] max-h-[300px] overflow-y-auto">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleWorkspaceChange(ws.id)}
                  className="cursor-pointer gap-2 w-full"
                >
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <Check className="h-4 w-4 flex-shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

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
          description="Manage your workspace configuration, email accounts, meeting accounts, and templates."
        />
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
        description="Manage your workspace configuration, email accounts, meeting accounts, and templates."
      />
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
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
            >
              <WorkspaceManagement currentWorkspace={workspace} />
              <WorkspaceGeneralSettings workspaceId={workspace.id} />
            </TabsContent>
          )}

          {canViewSettings && workspace?.id && (
            <TabsContent
              value="localization"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
            >
              <WorkspaceLocalizationSettings workspaceId={workspace.id} />
            </TabsContent>
          )}

          {canViewSubscription && (
            <TabsContent
              value="billing"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
            >
              <OrgSubscriptionPage
                canManageSubscription={canManageSubscription}
              />
            </TabsContent>
          )}

          {canManageEmail && (
            <TabsContent
              value="emails"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
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
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
            >
              <MeetingAccountsSettings workspace={workspace} />
            </TabsContent>
          )}

          {isSalesModule && (
            <TabsContent
              value="integrations"
              className="mt-0 flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col data-[state=active]:flex data-[state=active]:flex-1 data-[state=active]:flex-col data-[state=active]:min-h-0"
            >
              <WorkspaceIntegrationsSettings workspace={workspace} />
            </TabsContent>
          )}
        </Tabs>
      </PageBody>
    </>
  );
}

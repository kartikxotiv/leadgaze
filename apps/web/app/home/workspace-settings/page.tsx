'use client';

import { useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Building2, CreditCard, Globe, Mail, Settings2, Video } from 'lucide-react';

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
import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import OrgSubscriptionPage from '~/org/subscription/page';

import { WorkspaceLocalizationSettings } from './_components/localization-settings';
import { MeetingAccountsSettings } from './_components/meeting-accounts-settings';

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
  const { data: user } = useUser();
  const router = useRouter();
  const [_workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user?.id) return;
      const supabase = getSupabaseBrowserClient();

      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select(
            `
            workspace_id,
            workspaces (
              id,
              name
            )
          `,
          )
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (error) throw error;

        const rows = (data ?? []) as WorkspaceMembershipRow[];
        const uniqueWorkspaces = Array.from(
          new Map(
            rows
              .filter((item) => item.workspaces)
              .map((item) => [
                item.workspaces!.id,
                {
                  id: item.workspaces!.id,
                  name: item.workspaces!.name,
                },
              ]),
          ).values(),
        );

        setWorkspaces(uniqueWorkspaces);
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
      }
    };

    fetchWorkspaces();
  }, [user?.id]);

  const _handleWorkspaceChange = (workspaceId: string) => {
    localStorage.setItem('selectedWorkspace', workspaceId);
    router.refresh();
  };

  if (!currentWorkspace) return null;

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="mb-0">Workspace Management</CardTitle>
        <CardDescription>
          Select and manage your active workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="w-[300px] justify-between dark:text-white"
          >
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {currentWorkspace.name}
            </span>
          </Button>
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[300px] justify-between dark:text-white">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {currentWorkspace.name}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] h-[32px]">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleWorkspaceChange(ws.id)}
                  className="cursor-pointer gap-2 w-[290px] pt-0"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <Check className="h-4 w-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu> */}
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
  const canViewSubscription = canAccess('subscription', 'view');
  const canManageSubscription = canAccess('subscription', 'manage');
  const canManageEmail = canAccess('emails', 'manage_email');
  const canManageMeetings = 1 == 1 || canAccess('meetings', 'manage');

  const pathname = usePathname();
  const defaultTab = canViewSettings
    ? 'general'
    : canViewSubscription
      ? 'billing'
      : canManageMeetings
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
        <Tabs defaultValue={defaultTab} className="space-y-6 overflow-auto">
          <TabsList className="mb-1 h-auto w-full justify-start gap-8 rounded-none border-b bg-transparent p-0">
            {canViewSettings && (
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
            {canManageMeetings && (
              <TabsTrigger
                value="meetings"
                className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
              >
                <Video className="mr-2 h-4 w-4" />
                Meeting Accounts
              </TabsTrigger>
            )}
          </TabsList>

          {canViewSettings && (
            <TabsContent value="general">
              <WorkspaceManagement currentWorkspace={workspace} />
            </TabsContent>
          )}

          {canViewSettings && workspace?.id && (
            <TabsContent value="localization">
              <WorkspaceLocalizationSettings workspaceId={workspace.id} />
            </TabsContent>
          )}

          {canViewSubscription && (
            <TabsContent value="billing">
              <OrgSubscriptionPage
                canManageSubscription={canManageSubscription}
              />
            </TabsContent>
          )}

          {canManageEmail && (
            <TabsContent value="emails">
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

          {canManageMeetings && (
            <TabsContent value="meetings">
              <MeetingAccountsSettings workspace={workspace} />
            </TabsContent>
          )}
        </Tabs>
      </PageBody>
    </>
  );
}

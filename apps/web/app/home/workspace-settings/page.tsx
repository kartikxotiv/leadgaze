/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Building2, Check, ChevronDown, Mail, Settings2 } from 'lucide-react';

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

import { EmailAccountsSettings } from './_components/email-accounts-settings';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

function WorkspaceManagement({ currentWorkspace }: { currentWorkspace: any }) {
  const { data: user } = useUser();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);

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

        const uniqueWorkspaces = Array.from(
          new Map(
            data?.map((item: any) => [
              item.workspaces.id,
              {
                id: item.workspaces.id,
                name: item.workspaces.name,
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

  const handleWorkspaceChange = (workspaceId: string) => {
    localStorage.setItem('selectedWorkspace', workspaceId);
    router.refresh();
  };

  if (!currentWorkspace) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Management</CardTitle>
        <CardDescription>
          Select and manage your active workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[300px] justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {currentWorkspace.name}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => handleWorkspaceChange(ws.id)}
                  className="cursor-pointer gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <Check className="h-4 w-4" />
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
  const { currentWorkspace: workspace } = useRBAC();

  return (
    <>
      <PageHeader
        className='bg-sidebar'
        title="Workspace"
        description="Manage your workspace configuration, email accounts, and templates."
      />
      <PageBody className="bg-sidebar sticky flex min-w-0 flex-1 shrink-0 flex-col overflow-hidden pt-6 pb-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="general"
              className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
            >
              <Settings2 className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="emails"
              className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
            >
              <Mail className="mr-2 h-4 w-4" />
              Email Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <WorkspaceManagement currentWorkspace={workspace} />
          </TabsContent>

          <TabsContent value="emails">
            <EmailAccountsSettings workspace={workspace} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}

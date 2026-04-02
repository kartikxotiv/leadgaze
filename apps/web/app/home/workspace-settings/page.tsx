/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Check, Mail, LayoutTemplate, Settings2, ShieldCheck } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import { useRBAC } from '~/lib/rbac/rbac-provider';

import { EmailAccountsSettings } from './_components/email-accounts-settings';
import { EmailTemplatesSettings } from './_components/email-templates-settings';
import { EmailVariablesSettings } from './_components/email-variables-settings';

function WorkspaceManagement({ currentWorkspace }: { currentWorkspace: any }) {
  const { data: user } = useUser();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user?.id) return;

      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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
        title="Workspace Settings"
        description="Manage your workspace configuration, email accounts, and templates."
      />
      <PageBody>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
            <TabsTrigger
              value="general"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="emails"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
            >
              <Mail className="h-4 w-4 mr-2" />
              Email Accounts
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
            >
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Email Templates
            </TabsTrigger>
            <TabsTrigger
              value="variables"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Variables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <WorkspaceManagement currentWorkspace={workspace} />
          </TabsContent>

          <TabsContent value="emails">
            <EmailAccountsSettings workspace={workspace} />
          </TabsContent>

          <TabsContent value="templates">
            <EmailTemplatesSettings workspace={workspace} />
          </TabsContent>

          <TabsContent value="variables">
            <EmailVariablesSettings workspace={workspace} />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
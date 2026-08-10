'use client';

import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { CoreInboxTab } from './inbox-tab';
import { CoreEmailTemplatesTab } from './templates-tab';
import type { CoreEmailPageProps } from './types';
import { CoreEmailVariablesTab } from './variables-tab';

export function CoreEmailPage({ workspace, permissions }: CoreEmailPageProps) {
  const workspaceId = workspace?.id;
  const resolvedPermissions = {
    viewInbox: permissions?.viewInbox ?? true,
    manageTemplates: permissions?.manageTemplates ?? true,
    manageVariables: permissions?.manageVariables ?? true,
  };

  const tabs = [
    {
      value: 'inbox',
      label: 'Inbox',
      allowed: resolvedPermissions.viewInbox,
      component: workspaceId ? <CoreInboxTab workspaceId={workspaceId} /> : null,
    },
    {
      value: 'templates',
      label: 'Templates',
      allowed: resolvedPermissions.manageTemplates,
      component: workspaceId ? <CoreEmailTemplatesTab workspaceId={workspaceId} /> : null,
    },
    {
      value: 'variables',
      label: 'Variables',
      allowed: resolvedPermissions.manageVariables,
      component: workspaceId ? <CoreEmailVariablesTab workspaceId={workspaceId} /> : null,
    },
  ].filter((tab) => tab.allowed);

  return (
    <>
      <PageHeader
        className="bg-sidebar"
        title="Emails"
        description="Manage shared Core email inboxes, replies, templates, and variables."
      />
      <PageBody className="sticky flex min-w-0 flex-1 shrink-0 flex-col overflow-hidden p-2">
        {!workspaceId ? (
          <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
            Select a workspace to manage emails.
          </div>
        ) : tabs.length > 0 ? (
          <Tabs defaultValue={tabs[0]!.value}>
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.component}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
            You do not have permission to access Core emails.
          </div>
        )}
      </PageBody>
    </>
  );
}

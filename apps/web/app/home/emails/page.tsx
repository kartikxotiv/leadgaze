'use client';

import { PageBody, PageHeader } from '@kit/ui/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { useRBAC } from '~/lib/rbac/rbac-provider';

import { EmailTemplatesTab } from './_components/email-templates-tab';
import { EmailVariablesTab } from './_components/email-variables-tab';
import { InboxTab } from './_components/inbox-tab';

export default function EmailsPage() {
  const { canAccess } = useRBAC();

  const canViewInbox = canAccess('emails', 'view_inbox');
  const canManageTemplates = canAccess('emails', 'manage_templates');
  const canManageVariables = canAccess('emails', 'manage_variables');

  const availableTabs = [
    {
      value: 'inbox',
      label: 'Inbox',
      component: <InboxTab />,
      allowed: canViewInbox,
    },
    {
      value: 'templates',
      label: 'Templates',
      component: <EmailTemplatesTab />,
      allowed: canManageTemplates,
    },
    {
      value: 'variables',
      label: 'Variables',
      component: <EmailVariablesTab />,
      allowed: canManageVariables,
    },
  ].filter((tab) => tab.allowed);

  return (
    <>
      <PageHeader
        title="Emails"
        description="Manage your email inbox, templates, and variables."
      />
      <PageBody>
        {availableTabs.length > 0 ? (
          <Tabs defaultValue={availableTabs[0]!.value}>
            <TabsList>
              {availableTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {availableTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.component}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-muted-foreground">
              You do not have permission to access this page.
            </p>
          </div>
        )}
      </PageBody>
    </>
  );
}

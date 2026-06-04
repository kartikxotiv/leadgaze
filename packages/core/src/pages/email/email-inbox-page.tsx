'use client';

import { PageBody, PageHeader } from '@kit/ui/page';

import { CoreInboxTab } from './inbox-tab';
import type { CoreEmailPageProps } from './types';

export function CoreEmailInboxPage({
  workspace,
  permissions,
  embedded = false,
}: CoreEmailPageProps) {
  const workspaceId = workspace?.id;
  const canViewInbox = permissions?.viewInbox ?? true;
  const canReply = permissions?.sendEmails ?? true;

  const content = !workspaceId ? (
    <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
      Select a workspace to view inboxes.
    </div>
  ) : canViewInbox ? (
    <CoreInboxTab workspaceId={workspaceId} canReply={canReply} />
  ) : (
    <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
      You do not have permission to view inboxes.
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <>
      <PageHeader
        className="bg-sidebar"
        title="Inbox"
        description="View inbound and outbound workspace email conversations."
      />
      <PageBody className="bg-sidebar sticky flex min-w-0 flex-1 shrink-0 flex-col overflow-hidden pb-6 pt-6">
        {content}
      </PageBody>
    </>
  );
}

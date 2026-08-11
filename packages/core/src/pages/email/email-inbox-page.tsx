'use client';


import { CoreInboxTab } from './inbox-tab';
import type { CoreEmailPageProps } from './types';

export function CoreEmailInboxPage({
  workspace,
  permissions,
  embedded = false,
  renderEmailActions,
  templateContext,
  pageTitle,
  pageDescription,
}: CoreEmailPageProps) {
  const workspaceId = workspace?.id;
  const canViewInbox = permissions?.viewInbox ?? true;
  const canReply = permissions?.sendEmails ?? true;

  const content = !workspaceId ? (
    <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
      Select a workspace to view inboxes.
    </div>
  ) : canViewInbox ? (
    <CoreInboxTab
      workspaceId={workspaceId}
      canReply={canReply}
      renderEmailActions={renderEmailActions}
      templateContext={templateContext}
      pageTitle={pageTitle}
      pageDescription={pageDescription}
    />
  ) : (
    <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
      You do not have permission to view inboxes.
    </div>
  );

  return (
    <div className="flex min-w-0 flex-1 shrink-0 flex-col overflow-hidden">
      {content}
    </div>
  );
}

'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  MailPlus,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { Skeleton } from '@kit/ui/skeleton';
import { cn } from '@kit/ui/utils';

import type { CoreEmailAccount } from '../../services/email-accounts.service';
import { getCoreEmailAccountsService } from '../../services/email-accounts.service';
import {
  getCoreWorkspaceEmailActivityService,
  syncCoreEmailAccountsService,
} from '../../services/email-activity.service';
import { CoreEmailComposeDialog } from './compose-dialog';
import { CoreEmailDetailDialog } from './email-detail-dialog';
import { CoreEmailReplyDialog } from './reply-dialog';
import { useLocalization } from '@kit/shared/localization';

function recipientText(email: any) {
  if (Array.isArray(email.to_emails) && email.to_emails.length > 0) {
    return email.to_emails.join(', ');
  }

  return email.to_email ?? email.to_emails ?? '';
}

function emailTimestamp(email: any) {
  return email.received_at || email.sent_at || email.created_at;
}

export function CoreInboxTab({
  workspaceId,
  canReply = true,
  renderEmailActions,
  templateContext = {},
}: {
  workspaceId: string;
  canReply?: boolean;
  renderEmailActions?: (email: any) => ReactNode;
  templateContext?: Record<string, unknown>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedInboxEmail, setSelectedInboxEmail] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const limit = 25;
  const offset = (page - 1) * limit;
  const { formatDate } = useLocalization();

  const { data: accounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspaceId],
    queryFn: () => getCoreEmailAccountsService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const inboxAccounts = accounts.filter(
    (account: CoreEmailAccount) => account.can_view_inbox,
  );
  const sendableAccounts = accounts.filter(
    (account: CoreEmailAccount) =>
      account.can_send && account.is_active !== false,
  );

  useEffect(() => {
    setPage(1);
  }, [deferredSearchTerm, filter, selectedInboxEmail]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      'core-email-activity',
      workspaceId,
      selectedInboxEmail,
      filter,
      deferredSearchTerm,
      limit,
      offset,
    ],
    queryFn: () =>
      getCoreWorkspaceEmailActivityService(
        workspaceId,
        limit,
        offset,
        selectedInboxEmail !== 'all' ? selectedInboxEmail : undefined,
        {
          direction: filter,
          search: deferredSearchTerm,
        },
      ),
    enabled: Boolean(workspaceId),
  });

  const emails = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const pageStart = totalCount === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + emails.length, totalCount);

  const syncMutation = useMutation({
    mutationFn: () =>
      syncCoreEmailAccountsService({
        workspaceId,
        emailAccountId:
          selectedInboxEmail !== 'all'
            ? inboxAccounts.find(
                (account: CoreEmailAccount) =>
                  account.email === selectedInboxEmail,
              )?.id
            : undefined,
      }),
    onSuccess: async (result: any) => {
      await refetch();
      toast.success(
        `Synced ${result?.syncedCount ?? 0} email${result?.syncedCount === 1 ? '' : 's'}`,
      );
    },
    onError: (error: any) =>
      toast.error(error.message || 'Failed to sync inbox'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          {(['all', 'inbound', 'outbound'] as const).map((value) => (
            <Button
              key={value}
              variant={filter === value ? 'default' : 'outline'}
              className="h-[38px]"
              onClick={() => setFilter(value)}
            >
              {value[0]!.toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>

        <Select
          value={selectedInboxEmail}
          onValueChange={setSelectedInboxEmail}
        >
          <SelectTrigger className="w-full h-[38px] sm:w-[280px]">
            <SelectValue placeholder="Choose inbox" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All inboxes</SelectItem>
            {inboxAccounts.map((account: CoreEmailAccount) => (
              <SelectItem key={account.id} value={account.email}>
                {account.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ListToolBar
        showSearch
        searchPlaceholder="Search emails..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        actions={[
          ...(canReply
            ? [
                {
                  key: 'compose',
                  label: 'New Email',
                  icon: MailPlus,
                  onClick: () => {
                    if (sendableAccounts.length === 0) {
                      toast.error('No sendable accounts available');
                      return;
                    }
                    setIsComposeOpen(true);
                  },
                  show: true,
                  buttonVariant: 'default' as const,
                },
              ]
            : []),
          {
            key: 'sync',
            label:
              isFetching || syncMutation.isPending
                ? 'Syncing...'
                : 'Sync Inbox',
            icon: ((props: any) => (
              <RefreshCw
                className={cn(
                  props.className,
                  (isFetching || syncMutation.isPending) && 'animate-spin',
                )}
              />
            )) as any,
            onClick: () => syncMutation.mutate(),
            variant: 'icon' as const,
            show: true,
          },
        ]}
      />

      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="grid gap-3">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Direction icon circle */}
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="min-w-0 space-y-1.5">
                        {/* Subject line */}
                        <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-56' : i % 2 === 0 ? 'w-72' : 'w-64'}`} />
                        {/* From + timestamp */}
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-1 rounded-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                    {/* Direction badge */}
                    <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />
                  </div>
                  {/* Snippet lines */}
                  <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-full' : 'w-11/12'}`} />
                  {i % 3 !== 2 && <Skeleton className="h-3 w-4/5" />}
                </div>
              ))}
            </div>
          ) : emails.length === 0 ? (
            <div className="flex h-80 flex-col items-center justify-center gap-4 rounded-xl border border-dashed text-center">
              <Inbox className="text-muted-foreground h-10 w-10" />
              <div>
                <h3 className="font-semibold">No emails found</h3>
                <p className="text-muted-foreground text-sm">
                  Connect an account or adjust your filters.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex h-[calc(100vh-320px)] min-h-[400px] flex-col gap-3 overflow-y-auto pr-2 scrollbar-thin">
              {emails.map((email: any) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmail(email);
                    setIsDetailOpen(true);
                  }}
                  className="hover:border-primary/30 group flex-none cursor-pointer flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 text-left transition-all hover:shadow-md dark:border-gray-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          'rounded-full p-2',
                          email.direction === 'inbound'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                        )}
                      >
                        {email.direction === 'inbound' ? (
                          <Inbox className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold">
                          {email.subject || '(No Subject)'}
                        </h4>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                          <span>
                            {email.direction === 'inbound'
                              ? `From: ${email.from_email}`
                              : `To: ${recipientText(email)}`}
                          </span>
                          <span>•</span>
                          <span>
                            {formatDate(emailTimestamp(email))}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase"
                    >
                      {email.direction}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {email.snippet ||
                      email.text_body ||
                      String(email.body || '').replace(/<[^>]+>/g, '')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-900">
        <div className="text-muted-foreground">
          Showing {pageStart}-{pageEnd} of {totalCount} emails
          {isFetching ? ' · refreshing...' : ''}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-muted-foreground min-w-20 text-center text-xs">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isFetching}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      <CoreEmailDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        email={selectedEmail}
        canReply={canReply}
        actions={selectedEmail ? renderEmailActions?.(selectedEmail) : null}
        onReply={(email) => {
          setSelectedEmail(email);
          setIsDetailOpen(false);
          setIsReplyOpen(true);
        }}
      />

      {canReply ? (
        <>
          <CoreEmailReplyDialog
            open={isReplyOpen}
            onOpenChange={setIsReplyOpen}
            workspaceId={workspaceId}
            email={selectedEmail}
            accounts={accounts}
            templateContext={{
              ...templateContext,
              original_subject: selectedEmail?.subject ?? '',
              sender_email: selectedEmail?.from_email ?? '',
            }}
          />
          <CoreEmailComposeDialog
            open={isComposeOpen}
            onOpenChange={setIsComposeOpen}
            workspaceId={workspaceId}
            accounts={accounts}
            templateContext={templateContext}
          />
        </>
      ) : null}
    </div>
  );
}

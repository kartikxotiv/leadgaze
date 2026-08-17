'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  MailPlus,
  Paperclip,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { PageHeader } from '@kit/ui/page';
import { ColumnHeader } from '@kit/ui/column-header';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { TablePagination } from '@kit/ui/table-pagination';
import { useTableSort } from '@kit/ui/use-table-sort';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
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
  pageTitle,
  pageDescription,
}: {
  workspaceId: string;
  canReply?: boolean;
  renderEmailActions?: (email: any) => ReactNode;
  templateContext?: Record<string, unknown>;
  pageTitle?: string;
  pageDescription?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedInboxEmail, setSelectedInboxEmail] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const limit = pageSize;
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

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<any>(
    'core-inbox-emails',
    emails,
    { mode: 'client' }
  );

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
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {pageTitle && (
        <div className="flex items-center justify-between pb-0">
          <PageHeader title={pageTitle} description={pageDescription} className="w-full">
            {canReply && (
              <Button
                onClick={() => {
                  if (sendableAccounts.length === 0) {
                    toast.error('No sendable accounts available');
                    return;
                  }
                  setIsComposeOpen(true);
                }}
                className="secondary-text-small-bold gap-1.5 px-2 bg-leadgaze-primary hover:bg-leadgaze-primary/90 text-white"
              >
                <MailPlus className="h-4 w-4" />
                New Mail
              </Button>
            )}
          </PageHeader>
        </div>
      )}
      <div className={cn("flex w-full min-w-0 max-w-full shrink-0 items-center justify-between border-top-bottom-gray", !pageTitle && "border-top-bottom-gray")}>
        <div className="shrink-0 flex items-center pr-4 gap-3">
          <div className="flex items-center gap-2">
            {(['all', 'inbound', 'outbound'] as const).map((value) => (
              <Button
                key={value}
                variant={filter === value ? 'default' : 'outline'}
                className="secondary-text-small-bold"
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
            <SelectTrigger className="w-full h-[28px] sm:w-[200px] secondary-text-small-bold">
              <SelectValue placeholder="Choose inbox" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All inboxes</SelectItem>
              {inboxAccounts.map((account: CoreEmailAccount) => (
                <SelectItem key={account.id} value={account.email} className='secondary-text-small-bold'>
                  {account.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-[2px] flex flex-1 justify-end min-w-0">
          <ListToolBar
            className="border-none bg-transparent p-0"
            showSearch
            searchPlaceholder="Search"
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            actions={[
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
        </div>
      </div>

      <Card className="border-none bg-transparent shadow-none flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          {emails.length === 0 && !isLoading ? (
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
            <CustomTableContainer
              pagination={
                !isLoading ? (
                  <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(val) => {
                      setPageSize(val);
                      setPage(1);
                    }}
                    entityLabel="emails"
                  />
                ) : undefined
              }
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <ColumnHeader
                      label="Sender"
                      columnId="from_email"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      sortable={true}
                    />
                    <ColumnHeader
                      label="Subject & Preview"
                      columnId="subject"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      sortable={true}
                    />
                    <ColumnHeader
                      label="Status"
                      columnId="direction"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      sortable={true}
                    />
                    <ColumnHeader
                      label="Received"
                      columnId="received_at"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      sortable={true}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell className="min-w-[200px] py-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[400px] py-3">
                          <div className="space-y-2">
                            <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-3/4' : i % 2 === 0 ? 'w-full' : 'w-5/6'}`} />
                            <Skeleton className={`h-3 ${i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    sortedData.map((email: any) => (
                      <TableRow
                        key={email.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          setSelectedEmail(email);
                          setIsDetailOpen(true);
                        }}
                      >
                        <TableCell className="font-medium min-w-[200px] py-2">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'rounded-full p-1.5 flex-shrink-0',
                                email.direction === 'inbound'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                              )}
                            >
                              {email.direction === 'inbound' ? (
                                <Inbox className="h-3 w-3" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate primary-text-medium text-leadgaze-dark dark:text-white">
                                {email.direction === 'inbound'
                                  ? (email.from_name || email.from_email?.split('@')[0])
                                  : (email.to_name || recipientText(email)?.split('@')[0])}
                              </div>
                              <div className="text-muted-foreground truncate text-xs dark:text-white">
                                {email.direction === 'inbound'
                                  ? email.from_email
                                  : recipientText(email)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[400px] py-2">
                          <div className="line-clamp-2 text-sm text-wrap whitespace-normal break-words">
                            <span className="primary-text-medium text-leadgaze-dark dark:text-white inline-flex items-center gap-1.5 flex-wrap">
                              <span>{email.subject || '(No Subject)'}</span>
                              {Array.isArray(email.attachments) && email.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                                  <Paperclip className="h-3 w-3" />
                                  <span>{email.attachments.length}</span>
                                </span>
                              )}
                            </span>
                            <span className="text-muted-foreground">
                              {' — '}{email.snippet || email.text_body || String(email.body || '').replace(/<[^>]+>/g, '')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            className={cn(
                              "text-[10px] capitalize border-transparent",
                              email.direction === 'inbound' 
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                            )}
                            variant="outline"
                          >
                            {email.direction === 'inbound' ? 'InBound' : 'OutBound'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-sm py-2">
                          {formatDate(emailTimestamp(email))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CustomTableContainer>
          )}
        </CardContent>
      </Card>

      <CoreEmailDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        email={selectedEmail}
        allEmails={emails}
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

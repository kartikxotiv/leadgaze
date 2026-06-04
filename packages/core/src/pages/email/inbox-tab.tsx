'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Inbox, Loader2, RefreshCw, Search, Send } from 'lucide-react';
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
import { cn } from '@kit/ui/utils';

import type { CoreEmailAccount } from '../../services/email-accounts.service';
import {
  getCoreEmailAccountsService,
} from '../../services/email-accounts.service';
import {
  getCoreWorkspaceEmailActivityService,
  syncCoreEmailAccountsService,
} from '../../services/email-activity.service';
import { CoreEmailDetailDialog } from './email-detail-dialog';
import { CoreEmailReplyDialog } from './reply-dialog';

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
}: {
  workspaceId: string;
  canReply?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedInboxEmail, setSelectedInboxEmail] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const limit = 50;

  const { data: accounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspaceId],
    queryFn: () => getCoreEmailAccountsService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const inboxAccounts = accounts.filter((account: CoreEmailAccount) => account.can_view_inbox);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['core-email-activity', workspaceId, selectedInboxEmail],
    queryFn: () =>
      getCoreWorkspaceEmailActivityService(
        workspaceId,
        limit,
        0,
        selectedInboxEmail !== 'all' ? selectedInboxEmail : undefined,
      ),
    enabled: Boolean(workspaceId),
  });

  const emails = data?.data ?? [];

  const syncMutation = useMutation({
    mutationFn: () =>
      syncCoreEmailAccountsService({
        workspaceId,
        emailAccountId: selectedInboxEmail !== 'all'
          ? inboxAccounts.find((account: CoreEmailAccount) => account.email === selectedInboxEmail)?.id
          : undefined,
      }),
    onSuccess: async (result: any) => {
      await refetch();
      toast.success(
        `Synced ${result?.syncedCount ?? 0} email${result?.syncedCount === 1 ? '' : 's'}`,
      );
    },
    onError: (error: any) => toast.error(error.message || 'Failed to sync inbox'),
  });

  const filteredEmails = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    return emails.filter((email: any) => {
      const matchesSearch =
        !normalizedSearch ||
        email.subject?.toLowerCase().includes(normalizedSearch) ||
        email.from_email?.toLowerCase().includes(normalizedSearch) ||
        recipientText(email).toLowerCase().includes(normalizedSearch);

      const matchesFilter = filter === 'all' || email.direction === filter;

      return matchesSearch && matchesFilter;
    });
  }, [emails, filter, searchTerm]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            {(['all', 'inbound', 'outbound'] as const).map((value) => (
              <Button
                key={value}
                variant={filter === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(value)}
              >
                {value[0]!.toUpperCase() + value.slice(1)}
              </Button>
            ))}
          </div>

          <Select value={selectedInboxEmail} onValueChange={setSelectedInboxEmail}>
            <SelectTrigger className="w-full sm:w-[280px]">
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

        <div className="flex w-full gap-2 lg:w-auto">
          <div className="relative w-full lg:w-80">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              className="pl-10"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            disabled={isFetching || syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            <RefreshCw
              className={cn(
                'h-4 w-4',
                (isFetching || syncMutation.isPending) && 'animate-spin',
              )}
            />
          </Button>
        </div>
      </div>

      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Loading inbox...</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex h-80 flex-col items-center justify-center gap-4 rounded-xl border border-dashed text-center">
              <Inbox className="text-muted-foreground h-10 w-10" />
              <div>
                <h3 className="font-semibold">No emails found</h3>
                <p className="text-muted-foreground text-sm">Connect an account or adjust your filters.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredEmails.map((email: any) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmail(email);
                    setIsDetailOpen(true);
                  }}
                  className="group hover:border-primary/30 flex cursor-pointer flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 text-left transition-all hover:shadow-md dark:border-gray-800 dark:bg-zinc-900"
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
                        {email.direction === 'inbound' ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold">{email.subject || '(No Subject)'}</h4>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                          <span>{email.direction === 'inbound' ? `From: ${email.from_email}` : `To: ${recipientText(email)}`}</span>
                          <span>•</span>
                          <span>{new Date(emailTimestamp(email)).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {email.direction}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {email.snippet || email.text_body || String(email.body || '').replace(/<[^>]+>/g, '')}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CoreEmailDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        email={selectedEmail}
        canReply={canReply}
        onReply={(email) => {
          setSelectedEmail(email);
          setIsDetailOpen(false);
          setIsReplyOpen(true);
        }}
      />

      {canReply ? (
        <CoreEmailReplyDialog
          open={isReplyOpen}
          onOpenChange={setIsReplyOpen}
          workspaceId={workspaceId}
          email={selectedEmail}
          accounts={accounts}
        />
      ) : null}
    </div>
  );
}

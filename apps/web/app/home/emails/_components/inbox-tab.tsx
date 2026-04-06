'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ExternalLink,
  Inbox as InboxIcon,
  Loader2,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { cn } from '@kit/ui/utils';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getWorkspaceEmailActivityService } from '~/services/email.service';

import { EmailLeadDialog } from '../../leads/components/email-lead-dialog';
import { EmailDetailDialog } from './email-detail-dialog';

export function InboxTab() {
  const router = useRouter();
  const { currentWorkspace: workspace } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);

  // Fetch workspace email account for sending (replying)
  const { data: accountData } = useQuery({
    queryKey: ['workspace-email-account', workspace?.id],
    queryFn: async () => {
      // or use a dedicated service. Let's assume we have a workspace account service.
      const { getSupabaseBrowserClient } = await import(
        '@kit/supabase/browser-client'
      );
      const supabase = getSupabaseBrowserClient();
      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('workspace_id', workspace?.id || '')
        .limit(1);
      return accounts?.[0];
    },
    enabled: !!workspace?.id,
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['workspace-emails', workspace?.id, page],
    queryFn: () =>
      getWorkspaceEmailActivityService(
        workspace?.id || '',
        limit,
        (page - 1) * limit,
      ),
    enabled: !!workspace?.id,
  });

  const emails = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const filteredEmails = emails.filter(
    (email: {
      subject?: string;
      from_email?: string;
      to_emails?: string;
      direction: string;
    }) => {
      const matchesSearch =
        email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.to_emails?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'inbound' && email.direction === 'inbound') ||
        (filter === 'outbound' && email.direction === 'outbound');

      return matchesSearch && matchesFilter;
    },
  );

  const handleRefresh = () => {
    refetch();
  };

  const handleEmailClick = (email: any) => {
    setSelectedEmail(email);
    setIsDetailOpen(true);
  };

  const handleReply = (email: any) => {
    setSelectedEmail(email);
    setIsDetailOpen(false);
    setIsReplyOpen(true);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-full flex-col gap-4">
        {/* Filters and Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'inbound' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('inbound')}
            >
              Inbound
            </Button>
            <Button
              variant={filter === 'outbound' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('outbound')}
            >
              Outbound
            </Button>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Email List */}
        <Card className="flex-1 overflow-hidden border-none bg-transparent shadow-none">
          <CardContent className="flex h-full flex-col p-0">
            {isLoading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-4">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-sm text-gray-500">Loading your inbox...</p>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-gray-100 p-6 dark:bg-gray-800">
                  <InboxIcon className="h-12 w-12 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">No emails found</h3>
                  <p className="text-sm text-gray-500">
                    {searchTerm
                      ? 'Try adjusting your search or filters.'
                      : 'Your inbox is empty.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid flex-1 gap-4 overflow-y-auto pr-2">
                {filteredEmails.map(
                  (email: {
                    id: string;
                    subject?: string;
                    from_email?: string;
                    to_emails?: string;
                    direction: string;
                    received_at?: string;
                    created_at: string;
                    entity_id?: string;
                    entity_type?: string;
                    snippet?: string;
                    html_body?: string;
                  }) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailClick(email)}
                      className="group hover:border-primary/30 relative flex cursor-pointer flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'rounded-full p-2',
                              email.direction === 'inbound'
                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                            )}
                          >
                            {email.direction === 'inbound' ? (
                              <InboxIcon className="h-4 w-4" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-gray-900 dark:text-gray-100">
                              {email.subject || '(No Subject)'}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="font-medium text-gray-700 dark:text-gray-300">
                                {email.direction === 'inbound'
                                  ? `From: ${email.from_email}`
                                  : `To: ${email.to_emails}`}
                              </span>
                              <span>•</span>
                              <span>
                                {format(
                                  new Date(
                                    email.received_at || email.created_at,
                                  ),
                                  'MMM d, h:mm a',
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] tracking-wider uppercase"
                          >
                            {email.direction}
                          </Badge>
                          {email.entity_id && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(
                                        `/home/${email.entity_type === 'lead' ? 'leads' : 'contacts'}/${email.entity_id}`,
                                      );
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  View Linked {email.entity_type}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-col gap-1">
                        {email.snippet ? (
                          <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                            {email.snippet}
                          </p>
                        ) : (
                          <div
                            className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400"
                            dangerouslySetInnerHTML={{
                              __html: email.html_body || '',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex shrink-0 items-center justify-between rounded-xl border-t border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-zinc-900">
                <div className="text-xs text-gray-500">
                  Showing {Math.min((page - 1) * limit + 1, totalCount)} to{' '}
                  {Math.min(page * limit, totalCount)} of {totalCount} emails
                </div>
                <Pagination className="w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        className={
                          page === 1
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(5, totalPages) }).map(
                      (_, i) => {
                        // Simple pagination logic for first 5 pages or near current page
                        let pageNum = i + 1;
                        if (totalPages > 5 && page > 3) {
                          pageNum = page - 2 + i;
                          if (pageNum + (4 - i) > totalPages)
                            pageNum = totalPages - 4 + i;
                        }
                        if (pageNum <= 0 || pageNum > totalPages) return null;

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              isActive={page === pageNum}
                              onClick={() => setPage(pageNum)}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      },
                    )}

                    <PaginationItem>
                      <PaginationNext
                        className={
                          page === totalPages
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EmailDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        email={selectedEmail}
        onReply={handleReply}
      />

      {isReplyOpen && selectedEmail && (
        <EmailLeadDialog
          open={isReplyOpen}
          onOpenChange={setIsReplyOpen}
          workspaceEmailAccount={accountData}
          entityId={selectedEmail.entity_id}
          entityType={selectedEmail.entity_type || 'lead'}
          replyTo={{
            subject: selectedEmail.subject,
            email:
              selectedEmail.direction === 'inbound'
                ? selectedEmail.from_email
                : selectedEmail.to_emails,
            name:
              selectedEmail.direction === 'inbound'
                ? selectedEmail.from_email
                : selectedEmail.to_emails,
          }}
        />
      )}
    </div>
  );
}

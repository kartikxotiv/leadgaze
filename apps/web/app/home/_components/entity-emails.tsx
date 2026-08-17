'use client';

import { useEffect, useMemo, useState } from 'react';

import { Clock, Download, FileText, Loader2, Mail, MessageSquare, Paperclip, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import {
  CoreEmailComposeDialog,
  CoreEmailDetailDialog,
  CoreEmailReplyDialog,
} from '@kit/core/pages';
import {
  deleteCoreEmailActivityService,
  getCoreEmailAccountsService,
  getCoreEntityEmailActivityService,
} from '@kit/core/services';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import { cn } from '@kit/ui/utils';

import { useLocalization } from '~/lib/localization/localization-provider';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface EntityEmailsProps {
  entityId: string;
  entityType: 'lead' | 'contact' | 'account' | 'opportunity';
  entityName?: string;
  entityEmail?: string;
  recipientOptions?: Array<{
    email: string;
    name?: string;
    label?: string;
  }>;
  onOpenDraft?: (draft: unknown) => void;
}

export function EntityEmails({
  entityId,
  entityType,
  entityName,
  entityEmail,
  recipientOptions: _recipientOptions = [],
  onOpenDraft: _onOpenDraft,
}: EntityEmailsProps) {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const { formatDate } = useLocalization();
  const canManageEmail = canAccess('emails', 'manage_email');
  const [mounted, setMounted] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeRecipientEmail, setComposeRecipientEmail] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReplyOpen, setIsReplyOpen] = useState(false);

  const handleDownloadAttachment = async (e: React.MouseEvent, attachment: any) => {
    e.stopPropagation();
    try {
      const path = attachment.path || attachment.url;
      if (!path) return;

      if (path.startsWith('http://') || path.startsWith('https://')) {
        window.open(path, '_blank');
        return;
      }

      const { data, error } = await supabase.storage
        .from('email_attachments')
        .createSignedUrl(path, 300);

      if (error || !data?.signedUrl) {
        toast.error('Failed to download attachment');
        return;
      }

      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = attachment.name || attachment.fileName || 'attachment';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download attachment');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Database Query
  const { data: response, isLoading } = useQuery({
    queryKey: ['core-entity-emails', workspace?.id, entityType, entityId],
    queryFn: () =>
      getCoreEntityEmailActivityService(workspace!.id, entityType, entityId),
    enabled: canManageEmail && !!entityId && !!workspace?.id,
  });

  const { data: coreEmailAccounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspace?.id],
    queryFn: () => getCoreEmailAccountsService(workspace!.id),
    enabled: canManageEmail && !!workspace?.id,
  });

  const rawEmails = useMemo(() => response?.data || [], [response]);

  // Group emails by thread, keeping one card per conversation thread (including direct emails from lead or outbound threads)
  const conversationThreads = useMemo(() => {
    const threadMap = new Map<string, { latestEmail: any; threadCount: number; allEmails: any[] }>();

    rawEmails.forEach((email: any) => {
      // Find or assign thread identifier
      const threadKey =
        email.thread_key ||
        email.thread_id ||
        email.in_reply_to ||
        email.internet_message_id ||
        email.id;

      const existing = threadMap.get(threadKey);
      if (!existing) {
        threadMap.set(threadKey, {
          latestEmail: email,
          threadCount: 1,
          allEmails: [email],
        });
      } else {
        existing.threadCount += 1;
        existing.allEmails.push(email);

        const existingDate = new Date(
          existing.latestEmail.received_at ||
          existing.latestEmail.sent_at ||
          existing.latestEmail.created_at ||
          0
        ).getTime();
        const incomingDate = new Date(
          email.received_at ||
          email.sent_at ||
          email.created_at ||
          0
        ).getTime();

        if (incomingDate > existingDate) {
          existing.latestEmail = email;
        }
      }
    });

    return Array.from(threadMap.values()).map((entry) => ({
      ...entry.latestEmail,
      threadCount: entry.threadCount,
    }));
  }, [rawEmails]);

  // Handle delete
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteCoreEmailActivityService(id, workspace!.id);
      queryClient.invalidateQueries({
        queryKey: ['core-entity-emails', workspace?.id, entityType, entityId],
      });
      toast.success('Record removed');
    } catch {
      toast.error('Failed to remove record');
    }
  };

  if (!mounted) {
    return (
      <CardWidgetContainer
        title="Emails"
        icon={<Mail className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      >
        <div className="px-2">
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </div>
      </CardWidgetContainer>
    );
  }

  if (!canManageEmail) {
    return null;
  }

  if (isLoading) {
    return (
      <CardWidgetContainer
        title="Emails"
        icon={<Mail className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      >
        <div className="px-6 py-3">
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </div>
      </CardWidgetContainer>
    );
  }

  return (
    <>
      <CardWidgetContainer
        title="Emails"
        headerClassName="p-2 xl:p-2 2xl:p-2 mb-1"
        icon={<Mail className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
        icon2={
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-sm text-blue-500 hover:text-blue-600"
            onClick={() => {
              setComposeRecipientEmail('');
              setIsComposeOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Send Mail
          </Button>
        }
      >
        <div className="px-2">
          {conversationThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
                <Mail className="h-6 w-6 text-blue-500" />
              </div>
              <p className="mt-4 text-sm text-gray-500">No email activity yet</p>
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto mb-2">
              <CardWidgetList>
                {conversationThreads.map(
                  (
                    item: any, // eslint-disable-line @typescript-eslint/no-explicit-any
                  ) => (
                    <CardWidgetListItem
                      key={item.id}
                      onClick={() => {
                        setSelectedEmail(item);
                        setIsDetailOpen(true);
                      }}
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                      icon={
                        <div
                          className={cn(
                            'rounded-md p-2',
                            item.direction === 'inbound'
                              ? 'bg-purple-100 text-purple-600'
                              : item.status === 'sent'
                                ? 'bg-green-100 text-green-600'
                                : item.status === 'scheduled'
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-amber-100 text-amber-600',
                          )}
                        >
                          {item.direction === 'inbound' ? (
                            <Mail className="h-4 w-4" />
                          ) : item.status === 'sent' ? (
                            <Mail className="h-4 w-4" />
                          ) : item.status === 'scheduled' ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                      }
                      iconAlignTop={true}
                      title={
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{item.subject || '(No Subject)'}</span>
                          {item.threadCount > 1 && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-normal gap-1 shrink-0">
                              <MessageSquare className="h-2.5 w-2.5" />
                              <span>{item.threadCount}</span>
                            </Badge>
                          )}
                        </div>
                      }
                      badge={
                        <Badge
                          variant="outline"
                          className={cn(
                            'h-4 px-3 py-2.5 text-[10px]',
                            item.direction === 'inbound'
                              ? 'border-purple-200 bg-purple-50 text-purple-600'
                              : item.status === 'sent'
                                ? 'border-green-200 bg-green-50 text-green-600'
                                : item.status === 'scheduled'
                                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                                  : 'border-amber-200 bg-amber-50 text-amber-600',
                          )}
                        >
                          {item.direction === 'inbound'
                            ? 'Inbound'
                            : item.status.charAt(0).toUpperCase() +
                            item.status.slice(1)}
                        </Badge>
                      }
                      content={
                        <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400 break-words">
                          {item.snippet ||
                            (item.html_body || item.body || item.text_body || '')
                              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                              .replace(/<[^>]+>/g, ' ')
                              .replace(/\s+/g, ' ')
                              .trim() ||
                            'No content.'}
                        </p>
                      }
                      metadata={
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-leadgaze-dark dark:text-white">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDate(
                                item.received_at ||
                                item.sent_at ||
                                item.updated_at ||
                                item.created_at ||
                                new Date().toISOString(),
                              )}
                            </span>
                          </div>
                          {item.direction === 'inbound' ? (
                            <span className="max-w-[150px] truncate">
                              From: {item.from_email}
                            </span>
                          ) : (
                            <span className="max-w-[150px] truncate">
                              To: {item.to_emails}
                            </span>
                          )}
                          {(() => {
                            const ccVal = item.cc_emails ?? item.cc;
                            let ccStr = '';
                            if (Array.isArray(ccVal)) {
                              ccStr = ccVal.filter(Boolean).join(', ');
                            } else if (typeof ccVal === 'string') {
                              ccStr = ccVal.trim().replace(/^\[\s*\]$/, '');
                            }
                            if (!ccStr) return null;
                            return (
                              <span className="max-w-[150px] truncate">
                                CC: {ccStr}
                              </span>
                            );
                          })()}
                          {item.status === 'scheduled' && item.scheduled_at && (
                            <span className="font-semibold text-blue-600">
                              Due: {formatDate(item.scheduled_at)}
                            </span>
                          )}
                          {Array.isArray(item.attachments) && item.attachments.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {item.attachments.map((att: any, attIdx: number) => (
                                <button
                                  key={attIdx}
                                  type="button"
                                  onClick={(e) => handleDownloadAttachment(e, att)}
                                  className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/60 transition-colors"
                                  title={`Download ${att.name || att.fileName || 'attachment'}`}
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span className="max-w-[120px] truncate">
                                    {att.name || att.fileName || `File ${attIdx + 1}`}
                                  </span>
                                  <Download className="h-3 w-3 text-blue-500 shrink-0" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      }
                      actions={
                        item.status !== 'sent' &&
                        item.direction !== 'inbound' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => handleDelete(e, item.id)}
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )
                      }
                    />
                  ),
                )}
              </CardWidgetList>
            </div>
          )}
        </div>
      </CardWidgetContainer>

      <CoreEmailDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        email={selectedEmail}
        allEmails={rawEmails}
        onReply={(email) => {
          setSelectedEmail(email);
          setIsDetailOpen(false);
          setIsReplyOpen(true);
        }}
      />

      <CoreEmailReplyDialog
        open={isReplyOpen}
        onOpenChange={(open) => {
          setIsReplyOpen(open);
          if (!open) {
            queryClient.invalidateQueries({
              queryKey: [
                'core-entity-emails',
                workspace?.id,
                entityType,
                entityId,
              ],
            });
          }
        }}
        workspaceId={workspace?.id || ''}
        accounts={coreEmailAccounts}
        email={selectedEmail}
        entityType={entityType}
        entityId={entityId}
        templateContext={{
          entity_name: entityName,
          entity_email: entityEmail,
        }}
      />

      <CoreEmailComposeDialog
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) {
            setComposeRecipientEmail('');
            // Refresh entity email list after compose closes (may have sent)
            queryClient.invalidateQueries({
              queryKey: [
                'core-entity-emails',
                workspace?.id,
                entityType,
                entityId,
              ],
            });
          }
        }}
        workspaceId={workspace?.id || ''}
        accounts={coreEmailAccounts}
        entityType={entityType}
        entityId={entityId}
        initialTo={composeRecipientEmail || entityEmail}
        templateContext={{
          entity_name: entityName,
          entity_email: entityEmail,
        }}
      />
    </>
  );
}

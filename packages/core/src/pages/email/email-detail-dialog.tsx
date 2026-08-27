'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { Calendar, ChevronDown, ChevronUp, Download, Mail, MessageSquare, Paperclip, Reply, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { formatDate } from '@kit/shared/utils';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';

function formatFileSize(size?: number) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function displayDate(value?: string | null) {
  if (!value) return '-';
  return formatDate(value);
}

function normalizeRecipients(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/^\[\s*\]$/, '');
    if (!cleaned) return [];
    return cleaned
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item && item !== '[]');
  }

  return [];
}

function RecipientLine({ label, recipients }: { label: string; recipients: string[] }) {
  if (recipients.length === 0) return null;

  return (
    <div className="text-muted-foreground flex gap-2 primary-text-medium text-leadgaze-dark dark:text-white">
      <span className="w-10 shrink-0 primary-text-medium text-leadgaze-dark dark:text-white">{label}</span>
      <span className="min-w-0 break-words">{recipients.join(', ')}</span>
    </div>
  );
}

export function CoreEmailDetailDialog({
  open,
  onOpenChange,
  email,
  allEmails = [],
  onReply,
  canReply = true,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: any;
  allEmails?: any[];
  onReply: (email: any) => void;
  canReply?: boolean;
  actions?: ReactNode;
}) {
  const supabase = useSupabase();
  const [expandedThreadIds, setExpandedThreadIds] = useState<Record<string, boolean>>({});
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  // Compute thread emails (all messages in the same conversation thread)
  const threadEmails = useMemo(() => {
    if (!email || !allEmails || allEmails.length === 0) return [];

    const currentThreadKey = email.thread_key;
    const currentThreadId = email.thread_id;
    const currentMessageId = email.internet_message_id || email.provider_message_id;

    if (!currentThreadKey && !currentThreadId && !currentMessageId) {
      return [];
    }

    return allEmails.filter((item) => {
      if (item.id === email.id) return false;

      if (currentThreadKey && item.thread_key === currentThreadKey) return true;
      if (currentThreadId && item.thread_id === currentThreadId) return true;
      if (currentMessageId && (item.in_reply_to === currentMessageId || item.email_references?.includes(currentMessageId))) return true;
      if (email.in_reply_to && (item.internet_message_id === email.in_reply_to || item.provider_message_id === email.in_reply_to)) return true;

      return false;
    }).sort((a, b) => {
      const dateA = new Date(a.received_at || a.sent_at || a.created_at).getTime();
      const dateB = new Date(b.received_at || b.sent_at || b.created_at).getTime();
      return dateA - dateB; // chronological order for thread history
    });
  }, [email, allEmails]);

  if (!email) return null;

  const recipient = email.to_email ?? email.to_emails?.[0] ?? email.to_emails;
  const sender = email.from_email;
  const toRecipients = normalizeRecipients(email.to_emails ?? email.to_email);
  const ccRecipients = normalizeRecipients(email.cc_emails ?? email.cc);
  const bccRecipients = normalizeRecipients(email.bcc_emails ?? email.bcc);
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];

  const handleDownloadAttachment = async (attachment: any, parentEmail: any = email) => {
    const attachmentId = attachment.provider_attachment_id || attachment.id || attachment.name || attachment.fileName;
    if (downloadingAttachmentId === attachmentId) return;

    try {
      setDownloadingAttachmentId(attachmentId);
      const isProxy = !!attachment.provider_attachment_id;
      const path = attachment.path || attachment.url;

      if (!isProxy && !path) return;

      if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
        window.open(path, '_blank');
        return;
      }

      let downloadUrl = '';

      if (isProxy || (!path && (attachment.name || attachment.fileName))) {
        const params = new URLSearchParams({
          email_id: parentEmail.id,
          attachment_name: attachment.name || attachment.fileName || '',
        });
        if (attachment.provider_attachment_id) {
          params.set('attachment_id', attachment.provider_attachment_id);
        }
        downloadUrl = `/api/email/attachments/download?${params.toString()}`;
      } else if (path) {
        const { data, error } = await supabase.storage
          .from('email_attachments')
          .createSignedUrl(path, 300);

        if (error || !data?.signedUrl) {
          toast.error('Failed to download attachment');
          return;
        }
        downloadUrl = data.signedUrl;
      }

      if (!downloadUrl) return;

      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error('Failed to fetch attachment');

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = attachment.name || attachment.fileName || 'attachment';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download attachment');
    } finally {
      setDownloadingAttachmentId(null);
    }
  };

  const toggleThreadItem = (id: string) => {
    setExpandedThreadIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col p-0 overflow-hidden border-gray-200 bg-white sm:max-w-[800px] dark:border-slate-800 dark:bg-slate-950">
        <DialogHeader className="flex flex-row items-center justify-between custom-spacing-x-y bg-leadgaze-primary">
          <DialogTitle className="text-white truncate max-w-[80%]">
            {email.subject || '(No Subject)'}
            {threadEmails.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px] font-normal gap-1 align-middle">
                <MessageSquare className="h-3 w-3" />
                <span>{threadEmails.length + 1} messages</span>
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Thread Previous History Items (if any) */}
          {threadEmails.length > 0 && (
            <div className="border-b bg-zinc-50/40 divide-y divide-zinc-100 dark:bg-zinc-900/20 dark:divide-zinc-800">
              <div className="px-5 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Conversation Thread
              </div>
              {threadEmails.map((historyItem) => {
                const isExpanded = expandedThreadIds[historyItem.id];
                const histSender = historyItem.from_email;
                const histDate = displayDate(historyItem.received_at || historyItem.sent_at || historyItem.created_at);

                return (
                  <div key={historyItem.id} className="bg-white dark:bg-zinc-950 transition-colors">
                    <button
                      type="button"
                      onClick={() => toggleThreadItem(historyItem.id)}
                      className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {histSender}
                        </span>
                        <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 h-3.5">
                          {historyItem.direction}
                        </Badge>
                        <span className="truncate text-xs text-muted-foreground max-w-[200px]">
                          {historyItem.snippet || historyItem.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-[11px] shrink-0">
                        <span>{histDate}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-4 pt-1 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200">
                          {historyItem.html_body || historyItem.body ? (
                            <div
                              className="email-content leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: historyItem.html_body || historyItem.body }}
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap font-sans text-xs">
                              {historyItem.text_body || historyItem.snippet || ''}
                            </pre>
                          )}
                        </div>

                        {/* Rendering history item attachments here */}
                        {Array.isArray(historyItem.attachments) && historyItem.attachments.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="flex flex-wrap gap-2">
                              {historyItem.attachments.map((att: any, idx: number) => {
                                const name = att.name || att.fileName || `Attachment ${idx + 1}`;
                                const sizeStr = formatFileSize(att.size);
                                const attachmentId = att.provider_attachment_id || att.id || att.name || att.fileName;
                                const isDownloading = downloadingAttachmentId === attachmentId;
                                return (
                                  <div
                                    key={idx}
                                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
                                  >
                                    <Paperclip className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <span className="max-w-[150px] truncate font-medium text-zinc-800 dark:text-zinc-200" title={name}>
                                      {name}
                                    </span>
                                    {sizeStr && (
                                      <span className="text-[10px] text-muted-foreground">{sizeStr}</span>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={isDownloading}
                                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 shrink-0 ml-1"
                                      onClick={() => handleDownloadAttachment(att, historyItem)}
                                      title={`Download ${name}`}
                                    >
                                      {isDownloading ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Download className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Email View */}
          <div className="shrink-0 space-y-2 border-b bg-white custom-spacing-x-y py-2 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold mt-0.5">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="truncate primary-text-medium text-leadgaze-dark dark:text-white">
                      {email.direction === 'inbound' ? sender : recipient}
                    </span>
                    <Badge variant="outline" className="text-[9px] uppercase text-leadgaze-dark px-1.5 py-0 h-4">
                      {email.direction}
                    </Badge>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <RecipientLine label="From" recipients={normalizeRecipients(sender)} />
                    <RecipientLine label="To" recipients={toRecipients} />
                    <RecipientLine label="Cc" recipients={ccRecipients} />
                    <RecipientLine label="Bcc" recipients={bccRecipients} />
                  </div>
                </div>
              </div>
              <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-[11px]">
                <Calendar className="h-3 w-3" />
                {displayDate(email.received_at || email.sent_at || email.created_at)}
              </div>
            </div>
          </div>

          <div className="custom-spacing-x-y py-2 text-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200">
              {email.html_body || email.body ? (
                <div
                  className="email-content leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: email.html_body || email.body }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-xs">
                  {email.text_body || email.snippet || ''}
                </pre>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                  <span>Attachments ({attachments.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att: any, idx: number) => {
                    const name = att.name || att.fileName || `Attachment ${idx + 1}`;
                    const sizeStr = formatFileSize(att.size);
                    const attachmentId = att.provider_attachment_id || att.id || att.name || att.fileName;
                    const isDownloading = downloadingAttachmentId === attachmentId;
                    return (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="max-w-[150px] truncate font-medium text-zinc-800 dark:text-zinc-200" title={name}>
                          {name}
                        </span>
                        {sizeStr && (
                          <span className="text-[10px] text-muted-foreground">{sizeStr}</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isDownloading}
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 shrink-0 ml-1"
                          onClick={() => handleDownloadAttachment(att)}
                          title={`Download ${name}`}
                        >
                          {isDownloading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <div className="flex items-center gap-2">
            {canReply ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => onReply(email)}
              >
                <Reply className="h-3.5 w-3.5 mr-1" />
                Reply
              </Button>
            ) : (
              <span className="text-muted-foreground text-xs">
                You do not have permission to reply.
              </span>
            )}
            {actions}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

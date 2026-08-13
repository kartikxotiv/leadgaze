'use client';

import type { ReactNode } from 'react';

import { Calendar, Download, Mail, Paperclip, Reply, User } from 'lucide-react';
import { toast } from 'sonner';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { formatDate } from '@kit/shared/utils';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { ScrollArea } from '@kit/ui/scroll-area';
import { Separator } from '@kit/ui/separator';

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
    <div className="text-muted-foreground flex gap-2 text-xs">
      <span className="w-10 shrink-0 font-medium text-foreground">{label}</span>
      <span className="min-w-0 break-words">{recipients.join(', ')}</span>
    </div>
  );
}

export function CoreEmailDetailDialog({
  open,
  onOpenChange,
  email,
  onReply,
  canReply = true,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: any;
  onReply: (email: any) => void;
  canReply?: boolean;
  actions?: ReactNode;
}) {
  const supabase = useSupabase();

  if (!email) return null;

  const recipient = email.to_email ?? email.to_emails?.[0] ?? email.to_emails;
  const sender = email.from_email;
  const toRecipients = normalizeRecipients(email.to_emails ?? email.to_email);
  const ccRecipients = normalizeRecipients(email.cc_emails ?? email.cc);
  const bccRecipients = normalizeRecipients(email.bcc_emails ?? email.bcc);
  const attachments = Array.isArray(email.attachments) ? email.attachments : [];

  const handleDownloadAttachment = async (attachment: any) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {email.subject || '(No Subject)'}
        </DialogTitle>
        <div className="flex items-center justify-between border-b px-6 py-3 shrink-0">
          <div className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50 pr-12" title={email.subject || '(No Subject)'}>
            {email.subject || '(No Subject)'}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-3 bg-gray-50/50 px-6 py-4 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {email.direction === 'inbound' ? sender : recipient}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {email.direction}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Mail className="h-3 w-3" />
                    {email.direction === 'inbound'
                      ? `to ${recipient || 'me'}`
                      : `from ${sender || '-'}`}
                  </div>
                  <div className="mt-2 space-y-1">
                    <RecipientLine label="From" recipients={normalizeRecipients(sender)} />
                    <RecipientLine label="To" recipients={toRecipients} />
                    <RecipientLine label="Cc" recipients={ccRecipients} />
                    <RecipientLine label="Bcc" recipients={bccRecipients} />
                  </div>
                </div>
              </div>
              <div className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs font-medium">
                <Calendar className="h-3 w-3" />
                {displayDate(email.received_at || email.sent_at || email.created_at)}
              </div>
            </div>
          </div>

          <Separator />

          <ScrollArea className="flex-1 p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {email.html_body || email.body ? (
                <div
                  className="email-content"
                  dangerouslySetInnerHTML={{ __html: email.html_body || email.body }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {email.text_body || email.snippet || ''}
                </pre>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
                  <Paperclip className="h-4 w-4 text-blue-500" />
                  <span>Attachments ({attachments.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attachments.map((att: any, idx: number) => {
                    const name = att.name || att.fileName || `Attachment ${idx + 1}`;
                    const sizeStr = formatFileSize(att.size);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                            <Paperclip className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100" title={name}>
                              {name}
                            </p>
                            {sizeStr && (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{sizeStr}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2 text-xs font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/60 shrink-0"
                          onClick={() => handleDownloadAttachment(att)}
                          title={`Download ${name}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="flex shrink-0 items-center justify-between border-t bg-white px-6 py-4 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              {canReply ? (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                  onClick={() => onReply(email)}
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </Button>
              ) : (
                <span className="text-muted-foreground text-sm">
                  You do not have permission to reply.
                </span>
              )}
              {actions}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

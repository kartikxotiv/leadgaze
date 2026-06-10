'use client';

import type { ReactNode } from 'react';

import { Calendar, Mail, Reply, User } from 'lucide-react';

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

function displayDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function normalizeRecipients(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
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
  if (!email) return null;

  const recipient = email.to_email ?? email.to_emails?.[0] ?? email.to_emails;
  const sender = email.from_email;
  const toRecipients = normalizeRecipients(email.to_emails ?? email.to_email);
  const ccRecipients = normalizeRecipients(email.cc_emails ?? email.cc);
  const bccRecipients = normalizeRecipients(email.bcc_emails ?? email.bcc);

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

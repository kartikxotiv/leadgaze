'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Label } from '@kit/ui/label';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import type { CoreEmailAccount } from '../../services/email-accounts.service';
import { sendCoreEmailService } from '../../services/email-activity.service';

function normalizeRecipients(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function uniqueEmails(emails: string[]) {
  const seen = new Set<string>();

  return emails.filter((email) => {
    const normalized = email.toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function CoreEmailReplyDialog({
  open,
  onOpenChange,
  workspaceId,
  email,
  accounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  email: any;
  accounts: CoreEmailAccount[];
}) {
  const queryClient = useQueryClient();
  const sendableAccounts = useMemo(
    () => accounts.filter((account) => account.can_send && account.is_active !== false),
    [accounts],
  );
  const [emailAccountId, setEmailAccountId] = useState<string>('');
  const [replyMode, setReplyMode] = useState<'reply' | 'reply_all'>('reply');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open) {
      setEmailAccountId(String(sendableAccounts[0]?.id ?? ''));
      setReplyMode('reply');
      setBody('');
    }
  }, [open, sendableAccounts]);

  const mutation = useMutation({
    mutationFn: sendCoreEmailService,
    onSuccess: async () => {
      toast.success('Reply sent');
      await queryClient.invalidateQueries({ queryKey: ['core-email-activity', workspaceId] });
      onOpenChange(false);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to send reply'),
  });

  if (!email) return null;

  const selectedAccountEmail = sendableAccounts.find((account) => String(account.id) === emailAccountId)?.email;
  const sender = normalizeRecipients(email.from_email);
  const toRecipients = normalizeRecipients(email.to_emails ?? email.to_email);
  const ccRecipients = normalizeRecipients(email.cc_emails ?? email.cc);
  const bccRecipients = normalizeRecipients(email.bcc_emails ?? email.bcc);
  const ownEmails = new Set(
    [selectedAccountEmail, ...sendableAccounts.map((account) => account.email)]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase()),
  );
  const replyRecipients = email.direction === 'inbound'
    ? sender
    : toRecipients.length > 0
      ? toRecipients
      : sender;
  const replyAllRecipients = uniqueEmails([
    ...sender,
    ...toRecipients,
    ...ccRecipients,
  ]).filter((recipient) => !ownEmails.has(recipient.toLowerCase()));
  const recipients = replyMode === 'reply_all' ? replyAllRecipients : replyRecipients;
  const replyAllCcRecipients = replyMode === 'reply_all'
    ? uniqueEmails(ccRecipients).filter((recipient) => !ownEmails.has(recipient.toLowerCase()))
    : [];
  const bccDisplay = bccRecipients.length > 0 ? bccRecipients.join(', ') : 'None';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reply to Email</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>From</Label>
            <Select value={emailAccountId} onValueChange={setEmailAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose sending account" />
              </SelectTrigger>
              <SelectContent>
                {sendableAccounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-muted-foreground rounded-md border p-3 text-sm">
            Replying to <span className="font-medium">{recipients.join(', ') || 'No recipient'}</span>
            <br />
            {replyAllCcRecipients.length > 0 ? (
              <>
                Cc <span className="font-medium">{replyAllCcRecipients.join(', ')}</span>
                <br />
              </>
            ) : null}
            Original Bcc: <span className="font-medium">{bccDisplay}</span>
            <br />
            Subject: {email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`}
          </div>

          <div className="grid gap-2">
            <Label>Reply mode</Label>
            <RadioGroup
              value={replyMode}
              onValueChange={(value) => setReplyMode(value as 'reply' | 'reply_all')}
              className="grid gap-2 sm:grid-cols-2"
            >
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="reply" />
                <span>Reply to sender</span>
              </Label>
              <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                <RadioGroupItem value="reply_all" />
                <span>Reply all</span>
              </Label>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-48"
              placeholder="Write your reply..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={recipients.length === 0 || !emailAccountId || !body.trim() || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                workspaceId,
                emailAccountId: Number(emailAccountId),
                toEmails: recipients,
                cc: replyAllCcRecipients,
                subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`,
                body,
                threadId: email.thread_id,
                threadKey: email.thread_key || email.internet_message_id || email.provider_message_id,
                inReplyTo: email.internet_message_id || email.provider_message_id,
                references: email.email_references || email.internet_message_id || email.provider_message_id,
              })
            }
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Reply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

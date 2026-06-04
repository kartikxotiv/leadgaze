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
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open) {
      setEmailAccountId(String(sendableAccounts[0]?.id ?? ''));
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

  const recipient =
    email.direction === 'inbound'
      ? email.from_email
      : email.to_email ?? email.to_emails?.[0] ?? email.to_emails;

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
            Replying to <span className="font-medium">{recipient}</span>
            <br />
            Subject: {email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`}
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
            disabled={!recipient || !emailAccountId || !body.trim() || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                workspaceId,
                emailAccountId: Number(emailAccountId),
                toEmails: recipient,
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

'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutTemplate, Loader2, Send, Variable } from 'lucide-react';
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
import {
  getCoreEmailTemplatesService,
  getCoreEmailVariablesService,
} from '../../services/email-templates.service';
import { renderEmailContent, renderEmailTemplate } from './template-helpers';

function normalizeRecipients(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

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

function replySubject(subject?: string | null) {
  return subject?.startsWith('Re:') ? subject : `Re: ${subject || ''}`;
}

export function CoreEmailReplyDialog({
  open,
  onOpenChange,
  workspaceId,
  email,
  accounts,
  templateContext = {},
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  email: any;
  accounts: CoreEmailAccount[];
  templateContext?: Record<string, unknown>;
}) {
  const queryClient = useQueryClient();
  const sendableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.can_send && account.is_active !== false,
      ),
    [accounts],
  );
  const [emailAccountId, setEmailAccountId] = useState<string>('');
  const [replyMode, setReplyMode] = useState<'reply' | 'reply_all'>('reply');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['core-email-templates', workspaceId],
    queryFn: () => getCoreEmailTemplatesService(workspaceId),
    enabled: Boolean(open && workspaceId),
  });

  const { data: variables = [] } = useQuery({
    queryKey: ['core-email-variables', workspaceId],
    queryFn: () => getCoreEmailVariablesService(workspaceId),
    enabled: Boolean(open && workspaceId),
  });

  useEffect(() => {
    if (open) {
      setEmailAccountId(String(sendableAccounts[0]?.id ?? ''));
      setReplyMode('reply');
      setSubject(replySubject(email?.subject));
      setBody('');
      setTemplateId('');
    }
  }, [email, open, sendableAccounts]);

  const mutation = useMutation({
    mutationFn: sendCoreEmailService,
    onSuccess: async () => {
      toast.success('Reply sent');
      await queryClient.invalidateQueries({
        queryKey: ['core-email-activity', workspaceId],
      });
      onOpenChange(false);
    },
    onError: (error: any) =>
      toast.error(error.message || 'Failed to send reply'),
  });

  if (!email) return null;

  const selectedAccountEmail = sendableAccounts.find(
    (account) => String(account.id) === emailAccountId,
  )?.email;
  const sender = normalizeRecipients(email.from_email);
  const toRecipients = normalizeRecipients(email.to_emails ?? email.to_email);
  const ccRecipients = normalizeRecipients(email.cc_emails ?? email.cc);
  const bccRecipients = normalizeRecipients(email.bcc_emails ?? email.bcc);
  const ownEmails = new Set(
    [selectedAccountEmail, ...sendableAccounts.map((account) => account.email)]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase()),
  );
  const replyRecipients =
    email.direction === 'inbound'
      ? sender
      : toRecipients.length > 0
        ? toRecipients
        : sender;
  const replyAllRecipients = uniqueEmails([
    ...sender,
    ...toRecipients,
    ...ccRecipients,
  ]).filter((recipient) => !ownEmails.has(recipient.toLowerCase()));
  const recipients =
    replyMode === 'reply_all' ? replyAllRecipients : replyRecipients;
  const replyAllCcRecipients =
    replyMode === 'reply_all'
      ? uniqueEmails(ccRecipients).filter(
          (recipient) => !ownEmails.has(recipient.toLowerCase()),
        )
      : [];
  const bccDisplay =
    bccRecipients.length > 0 ? bccRecipients.join(', ') : 'None';

  const applyTemplate = (selectedTemplateId: string) => {
    setTemplateId(selectedTemplateId);
    const template = templates.find(
      (item: any) => String(item.id) === selectedTemplateId,
    );

    if (!template) return;

    const rendered = renderEmailTemplate(template, variables, {
      ...templateContext,
      original_subject: email.subject ?? '',
    });

    if (rendered.subject) {
      setSubject(replySubject(rendered.subject));
    }

    setBody(rendered.body);
    toast.success(`Applied template: ${template.name}`);
  };

  const insertVariable = (value: string) => {
    setBody((current) => `${current}${current ? '\n' : ''}${value}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reply to Email</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="h-4 w-4 text-blue-500" />
                    <SelectValue placeholder="Use email template" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="no-template" disabled>
                      No templates found
                    </SelectItem>
                  ) : (
                    templates.map((template: any) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {template.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Insert Variable</Label>
              <Select value="" onValueChange={insertVariable}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Variable className="h-4 w-4 text-emerald-500" />
                    <SelectValue placeholder="Add variable to message" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {variables.length === 0 ? (
                    <SelectItem value="no-variable" disabled>
                      No variables found
                    </SelectItem>
                  ) : (
                    variables.map((variable: any) => (
                      <SelectItem
                        key={variable.id}
                        value={`{{${variable.key}}}`}
                      >
                        {`{{${variable.key}}}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

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
            Replying to{' '}
            <span className="font-medium">
              {recipients.join(', ') || 'No recipient'}
            </span>
            <br />
            {replyAllCcRecipients.length > 0 ? (
              <>
                Cc{' '}
                <span className="font-medium">
                  {replyAllCcRecipients.join(', ')}
                </span>
                <br />
              </>
            ) : null}
            Original Bcc: <span className="font-medium">{bccDisplay}</span>
            <br />
            Subject: {subject}
          </div>

          <div className="grid gap-2">
            <Label>Reply mode</Label>
            <RadioGroup
              value={replyMode}
              onValueChange={(value) =>
                setReplyMode(value as 'reply' | 'reply_all')
              }
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
            disabled={
              recipients.length === 0 ||
              !emailAccountId ||
              !subject.trim() ||
              !body.trim() ||
              mutation.isPending
            }
            onClick={() =>
              mutation.mutate({
                workspaceId,
                emailAccountId: Number(emailAccountId),
                toEmails: recipients,
                cc: replyAllCcRecipients,
                subject: renderEmailContent(
                  subject,
                  variables,
                  templateContext,
                ),
                body: renderEmailContent(body, variables, templateContext),
                templateId: templateId ? Number(templateId) : undefined,
                threadId: email.thread_id,
                threadKey:
                  email.thread_key ||
                  email.internet_message_id ||
                  email.provider_message_id,
                inReplyTo:
                  email.internet_message_id || email.provider_message_id,
                references:
                  email.email_references ||
                  email.internet_message_id ||
                  email.provider_message_id,
              })
            }
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Reply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

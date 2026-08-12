'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bold,
  Italic,
  LayoutTemplate,
  Loader2,
  Send,
  Underline,
  Variable,
} from 'lucide-react';
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

import type { CoreEmailAccount } from '../../services/email-accounts.service';
import { sendCoreEmailService } from '../../services/email-activity.service';
import {
  getCoreEmailTemplatesService,
  getCoreEmailVariablesService,
} from '../../services/email-templates.service';
import {
  EmailAttachmentPicker,
  useEmailAttachments,
} from './email-attachments';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const {
    files: attachmentFiles,
    addFiles: addAttachmentFiles,
    removeFile: removeAttachmentFile,
    clearFiles: clearAttachmentFiles,
    uploadFiles: uploadAttachmentFiles,
    removeUploadedFiles,
  } = useEmailAttachments(workspaceId);

  const handleFormat = (command: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false);
      setBody(editorRef.current.innerHTML);
    }
  };

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
      clearAttachmentFiles();
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
      }, 0);
    }
  }, [clearAttachmentFiles, email, open, sendableAccounts]);

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const uploadedAttachments = await uploadAttachmentFiles();

      try {
        return await sendCoreEmailService({
          ...payload,
          attachments: uploadedAttachments,
        });
      } catch (error) {
        await removeUploadedFiles(uploadedAttachments);
        throw error;
      }
    },
    onSuccess: async () => {
      toast.success('Reply sent');
      clearAttachmentFiles();
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
    if (editorRef.current) {
      editorRef.current.innerHTML = rendered.body;
    }
    toast.success(`Applied template: ${template.name}`);
  };

  const insertVariable = (value: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertText', false, value);
      setBody(editorRef.current.innerHTML);
    } else {
      setBody((current) => `${current}${current ? '\n' : ''}${value}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>Reply to Email</DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            <div className="grid gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid">
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
                          <SelectItem
                            key={template.id}
                            value={String(template.id)}
                          >
                            {template.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid">
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

              <div className="grid">
                <Label>From</Label>
                <Select
                  value={emailAccountId}
                  onValueChange={setEmailAccountId}
                >
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

              <div className="grid">
                <Label>Reply mode</Label>
                <RadioGroup
                  value={replyMode}
                  onValueChange={(value) =>
                    setReplyMode(value as 'reply' | 'reply_all')
                  }
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                    <div className="flex gap-2 items-center">
                    <RadioGroupItem value="reply" />
                    <span>Reply to sender</span>
                    </div>
                  </Label>
                  <Label className="flex cursor-pointer items-center gap-2 rounded-md border p-2">
                    <div className="flex gap-2 items-center">
                    <RadioGroupItem value="reply_all" />
                    <span>Reply all</span>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              <div className="grid">
                <Label>Message</Label>
                <div className="overflow-hidden rounded-md border border-gray-200 dark:border-slate-800">
                  <div className="flex items-center gap-1 border-b bg-zinc-50 p-1 dark:bg-zinc-900/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleFormat('bold')}
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleFormat('italic')}
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleFormat('underline')}
                      title="Underline"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={(event) => setBody(event.currentTarget.innerHTML)}
                    className="min-h-48 bg-white p-4 text-sm outline-none dark:bg-slate-950"
                    style={{ minHeight: '12rem' }}
                  />
                </div>
              </div>

              <EmailAttachmentPicker
                files={attachmentFiles}
                disabled={mutation.isPending}
                onAddFiles={addAttachmentFiles}
                onRemoveFile={removeAttachmentFile}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

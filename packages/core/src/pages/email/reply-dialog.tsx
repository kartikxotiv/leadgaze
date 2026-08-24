'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutTemplate,
  Loader2,
  Maximize2,
  Paperclip,
  Send,
  Trash2,
  Variable,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { RichTextEditor, type RichTextEditorRef } from '@kit/ui/rich-text-editor';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import type { CoreEmailAccount } from '../../services/email-accounts.service';
import { sendCoreEmailService } from '../../services/email-activity.service';
import {
  getCoreEmailTemplatesService,
  getCoreEmailVariablesService,
} from '../../services/email-templates.service';
import {
  EmailAttachmentChips,
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
  entityType,
  entityId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  email: any;
  accounts: CoreEmailAccount[];
  templateContext?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  onSuccess?: (data?: any) => void;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);

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
  const editorRef = useRef<RichTextEditorRef>(null);

  const {
    files: attachmentFiles,
    addFiles: addAttachmentFiles,
    removeFile: removeAttachmentFile,
    clearFiles: clearAttachmentFiles,
    uploadFiles: uploadAttachmentFiles,
    removeUploadedFiles,
  } = useEmailAttachments(workspaceId);

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
      const defaultAccount = sendableAccounts.find((a) => String(a.id) === String(email?.email_account_id));
      setEmailAccountId(String(defaultAccount?.id ?? sendableAccounts[0]?.id ?? ''));
      setReplyMode('reply');
      setSubject(replySubject(email?.subject));
      setBody('');
      setTemplateId('');
      setIsMaximized(false);
      clearAttachmentFiles();
      setTimeout(() => {
        editorRef.current?.setHTML('');
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
    onSuccess: async (data) => {
      toast.success('Reply sent');
      clearAttachmentFiles();
      await queryClient.invalidateQueries({
        queryKey: ['core-email-activity', workspaceId],
      });
      if (entityType && entityId) {
        await queryClient.invalidateQueries({
          queryKey: ['core-entity-emails', workspaceId, entityType, entityId],
        });
      }
      onSuccess?.(data);
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
      editorRef.current.setHTML(rendered.body);
    }
    toast.success(`Applied template: ${template.name}`);
  };

  const insertVariable = (value: string) => {
    if (editorRef.current) {
      editorRef.current.insertText(value);
    } else {
      setBody((current) => `${current}${current ? ' ' : ''}${value}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex flex-col p-0 overflow-hidden border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${isMaximized
            ? 'w-[95vw] max-w-[95vw] h-[92vh] max-h-[92vh] rounded-lg'
            : 'max-h-[90vh] sm:max-w-[800px] h-[640px] rounded-lg'
          }`}
      >
        <TooltipProvider delayDuration={300}>
          <DialogHeader className="flex flex-row items-center justify-between px-4 py-3 bg-leadgaze-primary">
            <DialogTitle className="text-white truncate max-w-[80%]">{subject || 'Reply'}</DialogTitle>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                className="rounded p-1 text-white hover:bg-white/20 transition-colors mr-6"
                title={isMaximized ? 'Restore down' : 'Full screen'}
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          {/* Compact Reply Header */}
          <div className="flex flex-col text-sm divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-950">
            {/* From Account */}
            <div className="flex items-center px-4 py-1.5 gap-2">
              <span className="text-xs text-muted-foreground w-12 shrink-0">From</span>
              {sendableAccounts.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="text-xs text-zinc-800 dark:text-zinc-200 hover:underline font-medium focus:outline-none flex items-center gap-1.5"
                    >
                      {selectedAccountEmail || 'Select sending account'}
                      <span className="text-[10px] text-muted-foreground">▼</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {sendableAccounts.map((acc) => (
                      <DropdownMenuItem
                        key={acc.id}
                        onClick={() => setEmailAccountId(String(acc.id))}
                        className="text-xs cursor-pointer"
                      >
                        {acc.email}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  {selectedAccountEmail || 'No sending account available'}
                </span>
              )}
            </div>

            {/* Recipient & Mode */}
            <div className="flex items-center justify-between px-4 py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground w-12 shrink-0 font-medium">To</span>
                <span className="text-xs text-zinc-800 dark:text-zinc-200 truncate font-medium">
                  {recipients.join(', ') || 'No recipient'}
                </span>
                {replyAllCcRecipients.length > 0 && (
                  <span className="text-xs text-muted-foreground truncate">
                    (Cc: {replyAllCcRecipients.join(', ')})
                  </span>
                )}
              </div>

              {/* Reply Mode Toggle */}
              <div className="flex items-center gap-1 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setReplyMode('reply')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${replyMode === 'reply'
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setReplyMode('reply_all')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${replyMode === 'reply_all'
                      ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                >
                  Reply All
                </button>
              </div>
            </div>
          </div>

          {/* Email Body Canvas */}
          <div className="flex-1 overflow-y-auto flex flex-col bg-white dark:bg-zinc-950">
            <RichTextEditor
              ref={editorRef}
              value={body}
              onChange={setBody}
              placeholder="Write your reply here..."
              toolbarPosition="bottom"
              borderless
              className="flex-1 border-0 shadow-none"
              editorClassName="px-4 py-3 min-h-[16rem]"
            />
          </div>

          {/* Attachment Chips */}
          <EmailAttachmentChips
            files={attachmentFiles}
            disabled={mutation.isPending}
            onRemoveFile={removeAttachmentFile}
          />

          {/* Bottom Action Bar */}
          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between px-4 py-2 shrink-0 bg-white dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 gap-1.5 px-4 font-medium shadow-xs"
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
                    entityType,
                    entityId,
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Send Reply</span>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                disabled={mutation.isPending}
                onChange={(event) => {
                  try {
                    addAttachmentFiles(Array.from(event.target.files ?? []));
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Failed to add attachment',
                    );
                  } finally {
                    event.target.value = '';
                  }
                }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={mutation.isPending}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach files</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                      >
                        <LayoutTemplate className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Insert template</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto w-56">
                  {templates.length === 0 ? (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                      No templates found
                    </DropdownMenuItem>
                  ) : (
                    templates.map((template: any) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => applyTemplate(String(template.id))}
                        className="text-xs cursor-pointer truncate"
                      >
                        {template.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-full"
                      >
                        <Variable className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Insert variable merge tag</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto w-52">
                  {variables.length === 0 ? (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                      No variables found
                    </DropdownMenuItem>
                  ) : (
                    variables.map((variable: any) => (
                      <DropdownMenuItem
                        key={variable.id}
                        onClick={() => insertVariable(`{{${variable.key}}}`)}
                        className="text-xs cursor-pointer font-mono"
                      >
                        {`{{${variable.key}}}`}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-500 hover:text-red-600 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-full"
                    onClick={() => onOpenChange(false)}
                    title="Discard"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Discard</TooltipContent>
              </Tooltip>
            </div>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

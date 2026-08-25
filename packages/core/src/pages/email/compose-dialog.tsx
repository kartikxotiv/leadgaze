'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  LayoutTemplate,
  Loader2,
  Maximize2,
  Minus,
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

function splitEmails(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CoreEmailComposeDialog({
  open,
  onOpenChange,
  workspaceId,
  accounts,
  templateContext = {},
  entityType,
  entityId,
  initialTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  accounts: CoreEmailAccount[];
  templateContext?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  initialTo?: string;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.can_send && account.is_active !== false,
      ),
    [accounts],
  );

  const [emailAccountId, setEmailAccountId] = useState('');
  const [to, setTo] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [isFormattingBarOpen, setIsFormattingBarOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

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
      setEmailAccountId(String(sendableAccounts[0]?.id ?? ''));
      setTo(initialTo ?? '');
      setCc('');
      setBcc('');
      setShowCc(false);
      setShowBcc(false);
      setSubject('');
      setBody('');
      setTemplateId('');
      setIsMaximized(false);
      clearAttachmentFiles();
      setTimeout(() => {
        editorRef.current?.setHTML('');
      }, 0);
    }
  }, [clearAttachmentFiles, initialTo, open, sendableAccounts]);

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
      toast.success('Email sent');
      clearAttachmentFiles();
      await queryClient.invalidateQueries({
        queryKey: ['core-email-activity', workspaceId],
      });
      onOpenChange(false);
    },
    onError: (error: any) =>
      toast.error(error.message || 'Failed to send email'),
  });

  const toEmails = splitEmails(to);

  const applyTemplate = (selectedTemplateId: string) => {
    setTemplateId(selectedTemplateId);
    const template = templates.find(
      (item: any) => String(item.id) === selectedTemplateId,
    );

    if (!template) return;

    const rendered = renderEmailTemplate(template, variables, templateContext);
    setSubject(rendered.subject);
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

  const selectedAccount = sendableAccounts.find(
    (acc) => String(acc.id) === emailAccountId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex flex-col p-0 overflow-hidden border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950 ${isMaximized
            ? 'w-[95vw] max-w-[95vw] h-[92vh] max-h-[92vh]'
            : 'max-h-[90vh] sm:max-w-[800px] h-[640px]'
          }`}
      >
        <TooltipProvider delayDuration={300}>
          <DialogHeader className="flex flex-row items-center justify-between custom-spacing-x-y bg-leadgaze-primary">
            <DialogTitle className="text-white">New Message</DialogTitle>
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

          {/* Clean Flat Headers (From, To, Cc, Bcc, Subject) */}
          <div className="flex flex-col text-sm divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-950">
            {/* From Selector */}
            <div className="flex items-center custom-spacing-x-y py-2 gap-2">
              <span className="primary-text-regular text-muted-foreground w-12 shrink-0">From</span>
              {sendableAccounts.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="primary-text-regular text-zinc-800 dark:text-zinc-200 hover:underline font-medium focus:outline-none flex items-center gap-1.5"
                    >
                      {selectedAccount?.email || 'Select sending account'}
                      <span className="text-[10px] text-muted-foreground">▼</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {sendableAccounts.map((acc) => (
                      <DropdownMenuItem
                        key={acc.id}
                        onClick={() => setEmailAccountId(String(acc.id))}
                        className="primary-text-regular cursor-pointer"
                      >
                        {acc.email}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="primary-text-regular font-medium text-zinc-800 dark:text-zinc-200">
                  {selectedAccount?.email || 'No sending account available'}
                </span>
              )}
            </div>

            {/* To Line with Cc/Bcc triggers */}
            <div className="flex items-center custom-spacing-x-y py-2 gap-2">
              <span className="primary-text-regular text-muted-foreground w-12 shrink-0 font-medium">To</span>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipients (comma separated)"
                className="flex-1 bg-transparent primary-text-regular text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
              />
              <div className="flex items-center gap-2 primary-text-regular text-muted-foreground shrink-0">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* CC Line (collapsible) */}
            {showCc && (
              <div className="flex items-center custom-spacing-x-y py-2 gap-2">
                <span className="primary-text-regular text-muted-foreground w-12 shrink-0 font-medium">Cc</span>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Cc recipients"
                  className="flex-1 bg-transparent primary-text-regular text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCc('');
                    setShowCc(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* BCC Line (collapsible) */}
            {showBcc && (
              <div className="flex items-center custom-spacing-x-y py-2 gap-2">
                <span className="primary-text-regular text-muted-foreground w-12 shrink-0 font-medium">Bcc</span>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Bcc recipients"
                  className="flex-1 bg-transparent primary-text-regular text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    setBcc('');
                    setShowBcc(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Subject Line */}
            <div className="flex items-center custom-spacing-x-y py-2 gap-2">
              <span className="primary-text-regular text-muted-foreground w-12 shrink-0 font-medium">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 bg-transparent primary-text-regular text-zinc-900 placeholder:text-zinc-400 focus:outline-none font-normal dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Email Body Canvas */}
          <div className="flex-1 overflow-y-auto flex flex-col bg-white dark:bg-zinc-950">
            <RichTextEditor
              ref={editorRef}
              value={body}
              onChange={setBody}
              placeholder="Write your email here..."
              toolbarPosition="bottom"
              borderless
              className="flex-1 border-0 shadow-none"
              editorClassName="custom-spacing-x-y py-2 min-h-[16rem]"
            />
          </div>

          {/* Attachment Chips (Shown above action bar if any attached) */}
          <EmailAttachmentChips
            files={attachmentFiles}
            disabled={mutation.isPending}
            onRemoveFile={removeAttachmentFile}
          />

          {/* Bottom Gmail/Outlook Action Bar */}
          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between custom-spacing-x-y shrink-0 bg-white dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              {/* Send Button */}
              <Button
                size="sm"
                className="h-8 gap-1.5 px-4 font-medium shadow-xs"
                disabled={
                  !emailAccountId ||
                  toEmails.length === 0 ||
                  !subject.trim() ||
                  !body.trim() ||
                  mutation.isPending
                }
                onClick={() =>
                  mutation.mutate({
                    workspaceId,
                    emailAccountId: Number(emailAccountId),
                    toEmails,
                    cc: splitEmails(cc),
                    bcc: splitEmails(bcc),
                    subject: renderEmailContent(
                      subject,
                      variables,
                      templateContext,
                    ),
                    body: renderEmailContent(body, variables, templateContext),
                    templateId: templateId ? Number(templateId) : undefined,
                    entityType,
                    entityId,
                  })
                }
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Send</span>
              </Button>

              {/* Attach File Button */}
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

              {/* Template Selector Dropdown */}
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
                    <DropdownMenuItem disabled className="primary-text-regular text-muted-foreground">
                      No templates found
                    </DropdownMenuItem>
                  ) : (
                    templates.map((template: any) => (
                      <DropdownMenuItem
                        key={template.id}
                        onClick={() => applyTemplate(String(template.id))}
                        className="primary-text-regular cursor-pointer truncate"
                      >
                        {template.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Variable Selector Dropdown */}
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
                    <DropdownMenuItem disabled className="primary-text-regular text-muted-foreground">
                      No variables found
                    </DropdownMenuItem>
                  ) : (
                    variables.map((variable: any) => (
                      <DropdownMenuItem
                        key={variable.id}
                        onClick={() => insertVariable(`{{${variable.key}}}`)}
                        className="primary-text-regular cursor-pointer font-mono"
                      >
                        {`{{${variable.key}}}`}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Right side: Discard / Delete */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-zinc-500 hover:text-red-600 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 rounded-full"
                    onClick={() => onOpenChange(false)}
                    title="Discard draft"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Discard draft</TooltipContent>
              </Tooltip>
            </div>
          </DialogFooter>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Mail,
  Paperclip,
  Save,
  Type,
  Underline,
  X,
  LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { cn } from '@kit/ui/utils';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getLeadByIdService,
  sendLeadEmailService,
} from '~/services/leads.service';
import {
  EmailAccount,
  saveEmailActivityService,
} from '~/services/email.service';
import { 
  getEmailTemplatesService, 
  getWorkspaceVariablesService 
} from '~/services/email-templates.service';
import { replaceTemplateVariables } from '~/lib/email/template-utils';

interface EmailLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadEmail?: string;
  leadName?: string;
  initialDraft?: any;
  workspaceEmailAccounts: EmailAccount[];
  entityId?: string;
  entityType?: 'lead' | 'contact';
  replyTo?: {
    subject: string;
    email: string;
    name?: string;
  };
}

export function EmailLeadDialog({
  open,
  onOpenChange,
  leadId,
  leadEmail,
  leadName,
  initialDraft,
  workspaceEmailAccounts,
  entityId,
  entityType = 'lead',
  replyTo
}: EmailLeadDialogProps) {
  const queryClient = useQueryClient();
  const { canAccess } = useRBAC();
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [isSchedulePopoverOpen, setIsSchedulePopoverOpen] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccRecipients, setCcRecipients] = useState('');
  const [bccRecipients, setBccRecipients] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendableAccounts = workspaceEmailAccounts.filter(
    (account) => account.can_send && account.is_active !== false,
  );
  const selectedAccount =
    sendableAccounts.find(
      (account) => account.id.toString() === selectedAccountId,
    ) || sendableAccounts[0];
  const canSendEmails = canAccess('emails', 'send_emails');

  const { data: templates = [] } = useQuery({
    queryKey: ['email-templates', selectedAccount?.workspace_id],
    queryFn: () => getEmailTemplatesService(selectedAccount?.workspace_id || ''),
    enabled: !!selectedAccount?.workspace_id && open,
  });

  const { data: workspaceVariables = [] } = useQuery({
    queryKey: ['workspace-variables', selectedAccount?.workspace_id],
    queryFn: () => getWorkspaceVariablesService(selectedAccount?.workspace_id || ''),
    enabled: !!selectedAccount?.workspace_id && open,
  });

  const { data: leadData } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLeadByIdService(leadId),
    enabled: !!leadId && open,
  });

  useEffect(() => {
    if (sendableAccounts.length > 0) {
      setSelectedAccountId((current) => {
        if (
          current &&
          sendableAccounts.some((account) => account.id.toString() === current)
        ) {
          return current;
        }

        return sendableAccounts[0]?.id.toString() || '';
      });
    } else {
      setSelectedAccountId('');
    }
  }, [sendableAccounts]);

  // Load activity on open
  useEffect(() => {
    const populateFields = (draft: any) => {
      setSubject(draft.subject || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = draft.html_body || draft.body || '';
      } else {
        setTimeout(() => {
           if (editorRef.current) editorRef.current.innerHTML = draft.html_body || draft.body || '';
        }, 100);
      }
      if (draft.scheduled_at) {
        setScheduledAt(new Date(draft.scheduled_at));
        setScheduledTime(format(new Date(draft.scheduled_at), 'HH:mm'));
      } else {
        setScheduledAt(undefined);
        setScheduledTime('09:00');
      }
      const cc = draft.cc || draft.cc_emails || '';
      setCcRecipients(Array.isArray(cc) ? cc.join(', ') : cc);
      if (cc) setShowCc(true);

      const bcc = draft.bcc || draft.bcc_emails || '';
      setBccRecipients(Array.isArray(bcc) ? bcc.join(', ') : bcc);
      if (bcc) setShowBcc(true);
    };

    const resetFields = () => {
      setSubject(replyTo ? `Re: ${replyTo.subject}` : '');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setScheduledAt(undefined);
      setScheduledTime('09:00');
      setCcRecipients('');
      setBccRecipients('');
      setShowCc(false);
      setShowBcc(false);
    };

    if (open) {
      const timer = setTimeout(() => {
        if (initialDraft) {
          populateFields(initialDraft);
        } else {
          resetFields();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open, leadId, initialDraft, replyTo]);

  const handleFormat = (command: string, value: string | null = null) => {
    const editor = editorRef.current;
    if (
      editor &&
      document.activeElement !== editor &&
      !editor.contains(document.activeElement)
    ) {
      editor.focus();
    }
    document.execCommand(command, false, value || '');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleFormat('insertImage', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrompt = (
    command: string,
    message: string,
    defaultValue: string = '',
  ) => {
    const selection = window.getSelection();
    let range: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0).cloneRange();
    }

    const value = prompt(message, defaultValue);

    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    if (value !== null) {
      handleFormat(command, value);
    }
  };

  const handleSaveDraft = async () => {
    const message = editorRef.current?.innerHTML || '';
    if (!message && !subject) return;

    setIsSavingDraft(true);
    try {
      await saveEmailActivityService({
        id: initialDraft?.id,
        workspace_id: selectedAccount?.workspace_id,
        email_account_id: selectedAccount?.id,
        entity_id: entityId || leadId,
        entity_type: entityType,
        subject,
        body: message,
        to_emails: replyTo?.email || leadEmail,
        cc_emails: ccRecipients,
        bcc_emails: bccRecipients,
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        from_email: selectedAccount?.email,
      });

      toast.success(scheduledAt ? 'Email scheduled' : 'Draft saved');
      queryClient.invalidateQueries({ queryKey: ['lead-drafts', entityId || leadId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to save draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Unused but kept for reference if needed
  // const handleScheduleClick = () => {
  //   setIsSchedulePopoverOpen(true);
  // };

  const handleSelectSchedule = (date: Date | undefined) => {
    if (date) {
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const newDate = new Date(date);
      newDate.setHours(hours || 9);
      newDate.setMinutes(minutes || 0);
      setScheduledAt(newDate);
    } else {
      setScheduledAt(undefined);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setScheduledTime(newTime);
    if (scheduledAt) {
      const [hours, minutes] = newTime.split(':').map(Number);
      const newDate = new Date(scheduledAt);
      newDate.setHours(hours || 9);
      newDate.setMinutes(minutes || 0);
      setScheduledAt(newDate);
    }
  };

  const handleTemplateSelect = (template: any) => {
    if (!template) return;

    const data: Record<string, string> = {
      first_name: leadData?.first_name || '',
      last_name: leadData?.last_name || '',
      email: leadEmail || '',
    };

    // Merge workspace variables (environment variables)
    workspaceVariables.forEach((v: any) => {
      data[v.key] = v.value;
    });

    const renderedSubject = replaceTemplateVariables(template.subject, data);
    const renderedBody = replaceTemplateVariables(template.html_body, data);

    setSubject(renderedSubject);
    if (editorRef.current) {
      editorRef.current.innerHTML = renderedBody;
    }
    toast.success(`Applied template: ${template.name}`);
  };

  const handleSend = async () => {
    const message = editorRef.current?.innerHTML || '';

    // console.log('Sending email:', { leadId, subject, hasMessage: !!message });

    if (!subject || !message || message === '<br>' || message === '') {
      toast.error('Please fill in all fields');
      return;
    }

    if (!selectedAccount) {
      toast.error('Please select an email account');
      return;
    }

    if (!canSendEmails) {
      toast.error('You do not have permission to send emails');
      return;
    }

    setIsSending(true);
    try {
      const cc = ccRecipients
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      const bcc = bccRecipients
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0);

      await sendLeadEmailService({
        leadId: entityId || leadId,
        workspaceId: selectedAccount.workspace_id,
        emailAccountId: selectedAccount.id,
        toEmails: (replyTo?.email || leadEmail) as string,
        subject,
        body: message,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : undefined,
        emailId: initialDraft?.id,
      });

      if (!scheduledAt) {
        toast.success('Email sent successfully');
      } else {
        toast.success(`Email scheduled for ${format(scheduledAt, 'PPp')}`);
      }

      queryClient.invalidateQueries({ queryKey: ['lead-drafts', entityId || leadId] });

      onOpenChange(false);
      setSubject('');
      setCcRecipients('');
      setBccRecipients('');
      setScheduledAt(undefined);
      setShowCc(false);
      setShowBcc(false);
      if (editorRef.current) editorRef.current.innerHTML = '';
    } catch (error: any) {
      console.error('Email send error details:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden border-none bg-white p-0 shadow-2xl dark:bg-slate-950 max-h-[95vh] h-auto flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Email Lead</DialogTitle>
        </DialogHeader>

        {/* Custom Header */}
        <div className="flex items-center justify-between border-b px-4 py-1.5 shrink-0 bg-white dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-slate-600" />
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Email
            </span>
          </div>
          <div className="flex items-center gap-3 pr-2">
            <Select onValueChange={(val) => handleTemplateSelect(templates.find((t: any) => t.id.toString() === val))}>
              <SelectTrigger className="h-8 w-40 border-slate-200 bg-white text-xs dark:bg-slate-900 focus:ring-0">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="h-3.5 w-3.5 text-blue-500" />
                  <SelectValue placeholder="Use Template" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <div className="p-2 text-xs text-center text-slate-500">No templates found</div>
                ) : (
                  templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1 p-3 overflow-y-auto flex-1">
          {/* From Field - Real Dropdown */}
          <div className="flex items-center gap-2">
            <Label className="w-12 text-sm text-slate-500">
              <span className="text-red-500">*</span> From
            </Label>
            <Select
              value={selectedAccountId || 'no-account'}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger className="h-8 flex-1 border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 focus:ring-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sendableAccounts.length === 0 ? (
                  <SelectItem value="no-account" disabled>
                    Please add an email in workspace settings
                  </SelectItem>
                ) : (
                  sendableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.email}
                      {account.access_scope === 'workspace' ? ' · Shared' : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* To Field - Real Dropdown */}
          <div className="flex items-center gap-2">
            <Label className="w-12 text-sm text-slate-500">To</Label>
            <Select defaultValue="lead">
              <SelectTrigger className="h-8 flex-1 border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 focus:ring-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 border-emerald-100 bg-emerald-50 text-emerald-700"
                    >
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      {replyTo?.name || leadName || 'Recipient'}
                    </Badge>
                    <span className="text-xs text-slate-500">{`<${replyTo?.email || leadEmail}>`}</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex min-w-[60px] justify-end gap-2">
              {!showCc && (
                <button
                  onClick={() => setShowCc(true)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  onClick={() => setShowBcc(true)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* Cc Field */}
          {showCc && (
            <div className="flex items-center gap-2">
              <Label className="w-12 text-sm text-slate-500">Cc</Label>
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-950">
                <input
                  className="min-w-[50px] flex-1 bg-transparent text-sm outline-none"
                  placeholder="Enter Cc recipients (comma separated)..."
                  value={ccRecipients}
                  onChange={(e) => setCcRecipients(e.target.value)}
                />
                <button onClick={() => setShowCc(false)}>
                  <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            </div>
          )}

          {/* Bcc Field */}
          {showBcc && (
            <div className="flex items-center gap-2">
              <Label className="w-12 text-sm text-slate-500">Bcc</Label>
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-950">
                <input
                  className="min-w-[50px] flex-1 bg-transparent text-sm outline-none"
                  placeholder="Enter Bcc recipients (comma separated)..."
                  value={bccRecipients}
                  onChange={(e) => setBccRecipients(e.target.value)}
                />
                <button onClick={() => setShowBcc(false)}>
                  <X className="h-3 w-3 text-slate-400 hover:text-slate-600" />
                </button>
              </div>
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center gap-2">
            <Label className="w-12 text-sm text-slate-500">Subject</Label>
            <div className="flex flex-1 items-center rounded-md border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-950">
              <input
                className="flex-1 bg-transparent text-sm text-slate-700 outline-none dark:text-slate-300"
                placeholder="Enter Subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          {/* Toolbar */}
          <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-1 border-b bg-white p-1 dark:bg-slate-950">
              <Select
                onValueChange={(value) => handleFormat('fontName', value)}
              >
                <SelectTrigger className="h-6 w-[80px] border-none bg-transparent px-2 text-xs text-slate-600 hover:bg-slate-100 focus:ring-0">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Courier New">Courier</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Times New Roman">Times</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) => handleFormat('fontSize', value)}
              >
                <SelectTrigger className="h-6 w-[70px] border-none bg-transparent px-2 text-xs text-slate-600 hover:bg-slate-100 focus:ring-0">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Small</SelectItem>
                  <SelectItem value="3">Normal</SelectItem>
                  <SelectItem value="5">Large</SelectItem>
                  <SelectItem value="7">Huge</SelectItem>
                </SelectContent>
              </Select>
              <Separator orientation="vertical" className="mx-1 h-3" />
              <button
                className="rounded p-1 font-bold text-slate-700 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('bold');
                }}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded p-1 text-slate-700 italic hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('italic');
                }}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded p-1 text-slate-700 underline hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('underline');
                }}
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              <button
                className="flex items-center gap-0.5 rounded p-1 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePrompt('foreColor', 'Enter hex color (e.g., #ff0000)');
                }}
              >
                <Type className="h-3.5 w-3.5" />
                <ChevronDown className="h-2 w-2" />
              </button>
              <Separator orientation="vertical" className="mx-1 h-3" />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-0.5 rounded p-1 text-slate-600 hover:bg-slate-100">
                    <ImageIcon className="h-3.5 w-3.5" />
                    <ChevronDown className="h-2 w-2" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Paperclip className="h-4 w-4" />
                    Browse or Upload
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handlePrompt('insertImage', 'Enter the image URL')
                    }
                    className="flex items-center gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Web Image
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Separator orientation="vertical" className="mx-1 h-3" />
              <button
                className="rounded p-1 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('insertOrderedList');
                }}
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded p-1 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('insertUnorderedList');
                }}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <Separator orientation="vertical" className="mx-1 h-3" />
              <button
                className="rounded p-1 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('justifyLeft');
                }}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded p-1 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('justifyCenter');
                }}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded p-1 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('justifyRight');
                }}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="border-b bg-white p-1 dark:bg-slate-950">
              <button
                className="rounded border p-1 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePrompt('createLink', 'Enter the link URL');
                }}
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[180px] max-h-[350px] overflow-y-auto bg-white p-3 text-sm text-slate-800 outline-none dark:bg-slate-950 dark:text-slate-200 [&_ol]:list-decimal [&_ol]:pl-8 [&_ul]:list-disc [&_ul]:pl-8"
              onInput={() => { }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t bg-slate-50 px-4 py-1.5 dark:bg-slate-900">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            className="flex items-center gap-2 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            disabled={isSavingDraft || isSending}
          >
            {isSavingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </Button>

          <Popover
            open={isSchedulePopoverOpen}
            onOpenChange={setIsSchedulePopoverOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'flex items-center gap-2 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900',
                  scheduledAt &&
                  'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20',
                )}
                disabled={isSending}
              >
                <CalendarIcon className="h-4 w-4" />
                {scheduledAt
                  ? format(scheduledAt, 'MMM d, h:mm a')
                  : 'Schedule'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="border-b bg-slate-50/50 p-3 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-slate-500" />
                  Select Date & Time
                </div>
              </div>
              <Calendar
                mode="single"
                selected={scheduledAt}
                onSelect={handleSelectSchedule}
                initialFocus
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
              />
              <div className="flex items-center gap-3 border-t p-3">
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={handleTimeChange}
                  className="h-9 w-full"
                />
                <Button
                  size="sm"
                  className="h-9 px-4"
                  onClick={() => setIsSchedulePopoverOpen(false)}
                >
                  Done
                </Button>
              </div>
              {scheduledAt && (
                <div className="border-t bg-slate-50 p-2 text-center dark:bg-slate-900">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-full text-xs text-red-500 hover:text-red-600"
                    onClick={() => {
                      setScheduledAt(undefined);
                      setIsSchedulePopoverOpen(false);
                    }}
                  >
                    Clear Schedule
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleSend}
            className="h-auto rounded-full bg-blue-600 px-10 py-2.5 font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
            disabled={isSending || !selectedAccount?.email || !canSendEmails}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : scheduledAt ? (
              'Schedule'
            ) : (
              'Send'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

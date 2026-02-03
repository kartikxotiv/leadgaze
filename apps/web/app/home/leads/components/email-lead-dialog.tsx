'use client';

import { useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
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
  Minus,
  Paperclip,
  Save,
  Type,
  Underline,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@kit/supabase/hooks/use-user';
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

import {
  getLeadByIdService,
  sendLeadEmailService,
} from '~/services/leads.service';

interface EmailLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadEmail: string;
  leadName?: string;
  initialDraft?: any;
}

export function EmailLeadDialog({
  open,
  onOpenChange,
  leadId,
  leadEmail,
  leadName,
  initialDraft,
}: EmailLeadDialogProps) {
  const queryClient = useQueryClient();
  const { data: user } = useUser();
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
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load activity on open
  useEffect(() => {
    function loadLocalActivity() {
      if (open && leadId) {
        if (initialDraft) {
          populateFields(initialDraft);
          return;
        }

        // Default: find the most recent 'draft' or 'scheduled' item for this lead
        const activities = JSON.parse(
          localStorage.getItem(`email_activities_${leadId}`) || '[]',
        );
        const latestDraft = activities
          .filter((a: any) => a.type === 'draft' || a.type === 'scheduled')
          .sort(
            (a: any, b: any) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )[0];

        if (latestDraft) {
          populateFields(latestDraft);
        } else {
          resetFields();
        }
      }
    }

    const populateFields = (draft: any) => {
      setSubject(draft.subject || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = draft.body || '';
      }
      if (draft.scheduled_at) {
        setScheduledAt(new Date(draft.scheduled_at));
        setScheduledTime(format(new Date(draft.scheduled_at), 'HH:mm'));
      } else {
        setScheduledAt(undefined);
        setScheduledTime('09:00');
      }
      const cc = draft.cc || '';
      setCcRecipients(Array.isArray(cc) ? cc.join(', ') : cc);
      if (cc) setShowCc(true);

      const bcc = draft.bcc || '';
      setBccRecipients(Array.isArray(bcc) ? bcc.join(', ') : bcc);
      if (bcc) setShowBcc(true);
    };

    const resetFields = () => {
      setSubject('');
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

    loadLocalActivity();
  }, [open, leadId, initialDraft]);

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
      const draftData = {
        id: initialDraft?.id || Math.random().toString(36).substr(2, 9),
        type: scheduledAt ? 'scheduled' : 'draft',
        subject,
        body: message,
        recipients: leadEmail,
        cc: ccRecipients,
        bcc: bccRecipients,
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        timestamp: new Date().toISOString(),
      };

      // Unified Local Storage
      const activities = JSON.parse(
        localStorage.getItem(`email_activities_${leadId}`) || '[]',
      );
      const existingIndex = activities.findIndex(
        (a: any) => a.id === draftData.id,
      );

      if (existingIndex > -1) {
        activities[existingIndex] = draftData;
      } else {
        activities.unshift(draftData);
      }

      localStorage.setItem(
        `email_activities_${leadId}`,
        JSON.stringify(activities),
      );
      toast.success(scheduledAt ? 'Email scheduled' : 'Draft saved');
      queryClient.invalidateQueries({ queryKey: ['lead-drafts', leadId] });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleScheduleClick = () => {
    setIsSchedulePopoverOpen(true);
  };

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

  const handleSend = async () => {
    const message = editorRef.current?.innerHTML || '';

    console.log('Sending email:', { leadId, subject, hasMessage: !!message });

    if (!subject || !message || message === '<br>' || message === '') {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSending(true);
    try {
      if (!scheduledAt) {
        const cc = ccRecipients
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e.length > 0);
        const bcc = bccRecipients
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e.length > 0);

        const result = await sendLeadEmailService(leadId, {
          subject,
          body: message,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
        });
        console.log('Send result:', result);
        toast.success('Email sent successfully');
      } else {
        toast.success(`Email scheduled for ${format(scheduledAt, 'PPp')}`);
      }

      // Unified Local Storage Update
      const activities = JSON.parse(
        localStorage.getItem(`email_activities_${leadId}`) || '[]',
      );

      // Remove the draft/scheduled item if we were editing one
      const filtered = activities.filter((a: any) => a.id !== initialDraft?.id);

      // Add as "sent" or "scheduled"
      const sentItem = {
        id: Math.random().toString(36).substr(2, 9),
        type: scheduledAt ? 'scheduled' : 'sent',
        subject,
        body: message,
        sent_at: scheduledAt ? null : new Date().toISOString(),
        scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
        timestamp: new Date().toISOString(),
        recipients: leadEmail,
        cc: ccRecipients,
        bcc: bccRecipients,
      };

      localStorage.setItem(
        `email_activities_${leadId}`,
        JSON.stringify([sentItem, ...filtered]),
      );

      queryClient.invalidateQueries({ queryKey: ['lead-drafts', leadId] });

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
      <DialogContent className="max-w-2xl overflow-hidden border-none bg-white p-0 shadow-2xl dark:bg-slate-950">
        <DialogHeader className="sr-only">
          <DialogTitle>Email Lead</DialogTitle>
        </DialogHeader>

        {/* Custom Header */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-slate-600" />
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              Email
            </span>
          </div>
          <div className="flex items-center gap-3 pr-8">
            {/* Minimize and Maximize buttons removed */}
          </div>
        </div>

        <div className="space-y-3 p-4">
          {/* From Field - Real Dropdown */}
          <div className="flex items-center gap-2">
            <Label className="w-12 text-sm text-slate-500">
              <span className="text-red-500">*</span> From
            </Label>
            <Select defaultValue="user">
              <SelectTrigger className="h-auto flex-1 border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:ring-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">
                  {user?.email
                    ? `${user.email.split('@')[0]} <${user.email}>`
                    : 'Loading...'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* To Field - Real Dropdown */}
          <div className="flex items-center gap-2">
            <Label className="w-12 text-sm text-slate-500">To</Label>
            <Select defaultValue="lead">
              <SelectTrigger className="h-auto flex-1 border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 focus:ring-0 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
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
                      {leadName || 'Lead'}
                    </Badge>
                    <span className="text-xs text-slate-500">{`<${leadEmail}>`}</span>
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
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
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
              <div className="flex flex-1 flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
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
            <div className="flex flex-1 items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 dark:border-slate-800 dark:bg-slate-950">
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
            <div className="flex flex-wrap items-center gap-1 border-b bg-white p-1.5 dark:bg-slate-950">
              <Select
                onValueChange={(value) => handleFormat('fontName', value)}
              >
                <SelectTrigger className="h-7 w-[80px] border-none bg-transparent px-2 text-xs text-slate-600 hover:bg-slate-100 focus:ring-0">
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
                <SelectTrigger className="h-7 w-[70px] border-none bg-transparent px-2 text-xs text-slate-600 hover:bg-slate-100 focus:ring-0">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Small</SelectItem>
                  <SelectItem value="3">Normal</SelectItem>
                  <SelectItem value="5">Large</SelectItem>
                  <SelectItem value="7">Huge</SelectItem>
                </SelectContent>
              </Select>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <button
                className="rounded p-1.5 font-bold text-slate-700 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('bold');
                }}
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                className="rounded p-1.5 text-slate-700 italic hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('italic');
                }}
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                className="rounded p-1.5 text-slate-700 underline hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('underline');
                }}
              >
                <Underline className="h-4 w-4" />
              </button>
              <button
                className="flex items-center gap-0.5 rounded p-1.5 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePrompt('foreColor', 'Enter hex color (e.g., #ff0000)');
                }}
              >
                <Type className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </button>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-0.5 rounded p-1.5 text-slate-600 hover:bg-slate-100">
                    <ImageIcon className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
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
              <Separator orientation="vertical" className="mx-1 h-4" />
              <button
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('insertOrderedList');
                }}
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('insertUnorderedList');
                }}
              >
                <List className="h-4 w-4" />
              </button>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <button
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('justifyLeft');
                }}
              >
                <AlignLeft className="h-4 w-4" />
              </button>
              <button
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('justifyCenter');
                }}
              >
                <AlignCenter className="h-4 w-4" />
              </button>
              <button
                className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleFormat('justifyRight');
                }}
              >
                <AlignRight className="h-4 w-4" />
              </button>
            </div>
            <div className="border-b bg-white p-1.5 dark:bg-slate-950">
              <button
                className="rounded border p-1.5 text-slate-600 hover:bg-slate-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handlePrompt('createLink', 'Enter the link URL');
                }}
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[250px] overflow-y-auto bg-white p-4 text-sm text-slate-800 outline-none dark:bg-slate-950 dark:text-slate-200 [&_ol]:list-decimal [&_ol]:pl-8 [&_ul]:list-disc [&_ul]:pl-8"
              onInput={() => {}}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t bg-slate-50 px-4 py-3 dark:bg-slate-900">
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
            disabled={isSending}
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

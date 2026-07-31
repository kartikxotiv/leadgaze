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
import { Input } from '@kit/ui/input';
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
import {
  getCoreEmailTemplatesService,
  getCoreEmailVariablesService,
} from '../../services/email-templates.service';
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
  const sendableAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.can_send && account.is_active !== false,
      ),
    [accounts],
  );
  const [emailAccountId, setEmailAccountId] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
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
      setTo(initialTo ?? '');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setTemplateId('');
    }
  }, [open, sendableAccounts, initialTo]);

  const mutation = useMutation({
    mutationFn: sendCoreEmailService,
    onSuccess: async () => {
      toast.success('Email sent');
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
    toast.success(`Applied template: ${template.name}`);
  };

  const insertVariable = (value: string) => {
    setBody((current) => `${current}${current ? '\n' : ''}${value}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>New Email</DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto p-6 pb-8">
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

              <div className="grid gap-2">
                <Label>To</Label>
                <Input
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  placeholder="customer@example.com, another@example.com"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Cc</Label>
                  <Input
                    value={cc}
                    onChange={(event) => setCc(event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Bcc</Label>
                  <Input
                    value={bcc}
                    onChange={(event) => setBcc(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Message</Label>
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="min-h-52"
                  placeholder="Write your email..."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Info } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { RichTextEditor, type RichTextEditorRef } from '@kit/ui/rich-text-editor';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { 
  saveEmailTemplateService,
  getWorkspaceVariablesService
} from '~/services/email-templates.service';
import { getAvailableVariables } from '~/lib/email/template-utils';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
  workspaceId: string;
}

export function TemplateDialog({
  open,
  onOpenChange,
  template,
  workspaceId,
}: TemplateDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);
  const systemVariables = getAvailableVariables();

  const { data: customVariables = [] } = useQuery({
    queryKey: ['workspace-variables', workspaceId],
    queryFn: () => getWorkspaceVariablesService(workspaceId),
    enabled: !!workspaceId && open,
  });

  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setSubject(template.subject);
        setHtmlBody(template.html_body || '');
        setTimeout(() => {
          editorRef.current?.setHTML(template.html_body || '');
        }, 0);
      } else {
        setName('');
        setSubject('');
        setHtmlBody('');
        setTimeout(() => {
          editorRef.current?.setHTML('');
        }, 0);
      }
    }
  }, [open, template]);

  const handleSave = async () => {
    const content = editorRef.current?.getHTML() || htmlBody;

    if (!name || !subject || !content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      await saveEmailTemplateService({
        id: template?.id,
        workspace_id: workspaceId,
        name,
        subject,
        html_body: content,
        variables: [
          ...systemVariables.map(v => v.value),
          ...customVariables.map((v: any) => `{{${v.key}}}`)
        ],
      });

      toast.success(template ? 'Template updated' : 'Template created');
      queryClient.invalidateQueries({ queryKey: ['email-templates', workspaceId] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertText(variable);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 max-w-3xl overflow-hidden h-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit Template' : 'Create New Template'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-3 px-6 py-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="e.g., Intro Outreach"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Hello {{first_name}}!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              You can use variables like {'{{first_name}}'} in the subject line.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Template Body</Label>
              {customVariables.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">Insert:</span>
                  {customVariables.map((v: any) => (
                    <Button
                      key={v.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20"
                      onClick={() => insertVariable(`{{${v.key}}}`)}
                    >
                      {v.key}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <RichTextEditor
              ref={editorRef}
              value={htmlBody}
              onChange={setHtmlBody}
              minHeight="16rem"
              placeholder="Write your email template here..."
              toolbarExtra={
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-pointer">
                        <Info className="h-3.5 w-3.5 text-zinc-400" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Dynamic variables like {'{{lead_name}}'} will be replaced when sending.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


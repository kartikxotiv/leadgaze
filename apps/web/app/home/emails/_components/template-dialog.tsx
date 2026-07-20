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
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
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
        // Small timeout to ensure editor is mounted
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.innerHTML = template.html_body || '';
          }
        }, 0);
      } else {
        setName('');
        setSubject('');
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
      }
    }
  }, [open, template]);

  const handleSave = async () => {
    const htmlBody = editorRef.current?.innerHTML || '';

    if (!name || !subject || !htmlBody) {
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
        html_body: htmlBody,
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
      editorRef.current.focus();
      document.execCommand('insertText', false, variable);
    }
  };

  const handleFormat = (command: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 max-w-3xl overflow-hidden p-0 h-auto flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-b p-6 pb-4">
          <DialogTitle>{template ? 'Edit Template' : 'Create New Template'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="e.g., Intro Outreach"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <div className="flex flex-col gap-2">
              {/* <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Variables</Label>
                <div className="flex flex-wrap gap-1.5">
                  {systemVariables.map((v) => (
                    <Button
                      key={v.value}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 bg-blue-50/50 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/10 dark:border-blue-900/20"
                      onClick={() => insertVariable(v.value)}
                    >
                      {v.label}
                    </Button>
                  ))}
                </div>
              </div> */}

              {customVariables.length > 0 && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Environment Variables</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {customVariables.map((v: any) => (
                      <Button
                        key={v.key}
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20"
                        onClick={() => insertVariable(`{{${v.key}}}`)}
                      >
                        {v.key}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <div className="flex items-center gap-1 border-b bg-zinc-50 p-1 dark:bg-zinc-800/50">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFormat('bold')}><b>B</b></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFormat('italic')}><i>I</i></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleFormat('underline')}><u>U</u></Button>
                <div className="ml-auto flex items-center gap-2 px-2">
                   <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Dynamic variables will be replaced when sending.</p>
                        </TooltipContent>
                      </Tooltip>
                   </TooltipProvider>
                </div>
              </div>
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[300px] p-4 text-sm outline-none bg-white dark:bg-zinc-950"
              />
            </div>
          </div>
        </div>

        
      <DialogFooter className="px-6 py-4 border-t bg-zinc-50 dark:bg-zinc-900/50 border-t p-6 mt-auto">
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

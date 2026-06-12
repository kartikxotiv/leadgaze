'use client';

import React from 'react';
import { 
  Reply, 
  Calendar, 
  User, 
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Separator } from '@kit/ui/separator';
import { ScrollArea } from '@kit/ui/scroll-area';

interface EmailDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: any;
  onReply: (email: any) => void;
}

export function EmailDetailDialog({
  open,
  onOpenChange,
  email,
  onReply
}: EmailDetailDialogProps) {
  if (!email) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0 border-b p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold truncate pr-8">
              {email.subject || '(No Subject)'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Email Headers */}
          <div className="px-6 py-4 bg-gray-50/50 dark:bg-zinc-900/50 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {email.direction === 'inbound' ? email.from_email : email.to_emails}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {email.direction}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {email.direction === 'inbound' ? `to ${email.to_emails || 'me'}` : `from ${email.from_email}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 flex items-center justify-end gap-1 font-medium">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(email.received_at || email.created_at), 'PPP p')}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Body */}
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-none prose dark:prose-invert prose-sm">
              {email.html_body ? (
                <div 
                  className="email-content"
                  dangerouslySetInnerHTML={{ __html: email.html_body }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {email.text_body || email.snippet}
                </pre>
              )}
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t bg-white dark:bg-zinc-950 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm" 
                className="gap-2"
                onClick={() => onReply(email)}
              >
                <Reply className="h-4 w-4" />
                Reply
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

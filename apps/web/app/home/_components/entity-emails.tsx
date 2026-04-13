'use client';

import { useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, FileText, Loader2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';
import { useRBAC } from '~/lib/rbac/rbac-provider';

import {
  getEntityEmailActivityService,
  deleteEmailActivityService,
  getWorkspaceEmailAccountService,
} from '~/services/email.service';
import { EmailLeadDialog } from '../leads/components/email-lead-dialog';
import { EmailDetailDialog } from '../emails/_components/email-detail-dialog';

interface EntityEmailsProps {
  entityId: string;
  entityType: 'lead' | 'contact' | 'account' | 'opportunity';
  entityName?: string;
  entityEmail?: string;
  onOpenDraft?: (draft: any) => void;
}

export function EntityEmails({
  entityId,
  entityType,
  entityName,
  entityEmail,
  onOpenDraft,
}: EntityEmailsProps) {
  const queryClient = useQueryClient();
  const { currentWorkspace: workspace } = useRBAC();
  const [mounted, setMounted] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Database Query
  const { data: response, isLoading } = useQuery({
    queryKey: ['entity-emails', entityType, entityId],
    queryFn: () => getEntityEmailActivityService(entityId, entityType),
    enabled: !!entityId,
  });

  const { data: workspaceEmailAccounts = [] } = useQuery({
    queryKey: ['workspace-email-accounts', workspace?.id],
    queryFn: () => getWorkspaceEmailAccountService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const combinedItems = response?.data || [];

  // Handle delete
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteEmailActivityService(id);
      queryClient.invalidateQueries({ queryKey: ['entity-emails', entityType, entityId] });
      toast.success('Record removed');
    } catch (error: any) {
      toast.error('Failed to remove record');
    }
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg">Emails</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg">Emails</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (combinedItems.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg">Emails</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Mail className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No email activity yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg">Emails</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {combinedItems.map((item: any) => (
              <div
                key={item.id}
                className={cn(
                  'group relative rounded-lg border border-gray-100 bg-gray-50 p-3 transition-all dark:border-gray-800 dark:bg-slate-900',
                  item.status !== 'sent'
                    ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800'
                    : 'cursor-default',
                )}
                onClick={() => {
                  if (item.direction !== 'inbound' && item.status !== 'sent') {
                    if (onOpenDraft) {
                      onOpenDraft(item);
                      return;
                    }

                    setSelectedDraft(item);
                    setIsComposeOpen(true);
                    return;
                  }

                  setSelectedEmail(item);
                  setIsDetailOpen(true);
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'mt-0.5 rounded-full p-2',
                      item.direction === 'inbound'
                        ? 'bg-purple-100 text-purple-600'
                        : item.status === 'sent'
                          ? 'bg-green-100 text-green-600'
                          : item.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-amber-100 text-amber-600',
                    )}
                  >
                    {item.direction === 'inbound' ? (
                      <Mail className="h-4 w-4" />
                    ) : item.status === 'sent' ? (
                      <Mail className="h-4 w-4" />
                    ) : item.status === 'scheduled' ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.subject || '(No Subject)'}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-4 px-1 text-[10px]',
                          item.direction === 'inbound'
                            ? 'border-purple-200 bg-purple-50 text-purple-600'
                            : item.status === 'sent'
                              ? 'border-green-200 bg-green-50 text-green-600'
                              : item.status === 'scheduled'
                                ? 'border-blue-200 bg-blue-50 text-blue-600'
                                : 'border-amber-200 bg-amber-50 text-amber-600',
                        )}
                      >
                        {item.direction === 'inbound'
                          ? 'Inbound'
                          : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                      {item.direction !== 'inbound' && item.status !== 'sent' && (
                        <span className="text-[10px] text-blue-500 italic opacity-0 transition-opacity group-hover:opacity-100">
                          • Click to Edit
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400"
                      dangerouslySetInnerHTML={{ __html: item.html_body }}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(
                            item.received_at ||
                              item.sent_at ||
                              item.updated_at ||
                              item.created_at ||
                              new Date(),
                          ).toLocaleString()}
                        </span>
                      </div>
                      {item.direction === 'inbound' ? (
                        <span className="max-w-[150px] truncate">
                          From: {item.from_email}
                        </span>
                      ) : (
                        <span className="max-w-[150px] truncate">
                          To: {item.to_emails}
                        </span>
                      )}
                      {item.cc_emails && (
                        <span className="max-w-[100px] truncate">
                          CC: {item.cc_emails}
                        </span>
                      )}
                      {item.status === 'scheduled' && item.scheduled_at && (
                        <span className="font-semibold text-blue-600">
                          Due: {new Date(item.scheduled_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {item.status !== 'sent' && item.direction !== 'inbound' && (
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="absolute top-3 right-3 p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <EmailDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        email={selectedEmail}
        onReply={(email) => {
          setSelectedEmail(email);
          setSelectedDraft(null);
          setIsDetailOpen(false);
          setIsComposeOpen(true);
        }}
      />

      <EmailLeadDialog
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) {
            setSelectedDraft(null);
          }
        }}
        leadEmail={entityEmail}
        leadName={entityName}
        initialDraft={selectedDraft}
        workspaceEmailAccounts={workspaceEmailAccounts}
        entityId={entityId}
        entityType={entityType}
        replyTo={
          selectedEmail
            ? {
                subject: selectedEmail.subject,
                email:
                  selectedEmail.direction === 'inbound'
                    ? selectedEmail.from_email
                    : selectedEmail.to_emails,
                name:
                  selectedEmail.direction === 'inbound'
                    ? selectedEmail.from_email
                    : selectedEmail.to_emails,
              }
            : undefined
        }
      />
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, FileText, Loader2, Mail, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailComposeDialog, CoreEmailDetailDialog } from '@kit/core/pages';
import {
  deleteCoreEmailActivityService,
  getCoreEmailAccountsService,
  getCoreEntityEmailActivityService,
} from '@kit/core/services';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import { cn } from '@kit/ui/utils';

import { useRBAC } from '~/lib/rbac/rbac-provider';

interface EntityEmailsProps {
  entityId: string;
  entityType: 'lead' | 'contact' | 'account' | 'opportunity';
  entityName?: string;
  entityEmail?: string;
  recipientOptions?: Array<{
    email: string;
    name?: string;
    label?: string;
  }>;
  onOpenDraft?: (draft: unknown) => void;
}

export function EntityEmails({
  entityId,
  entityType,
  entityName,
  entityEmail,
  recipientOptions: _recipientOptions = [],
  onOpenDraft: _onOpenDraft,
}: EntityEmailsProps) {
  const queryClient = useQueryClient();
  const { currentWorkspace: workspace } = useRBAC();
  const [mounted, setMounted] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeRecipientEmail, setComposeRecipientEmail] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Database Query
  const { data: response, isLoading } = useQuery({
    queryKey: ['core-entity-emails', workspace?.id, entityType, entityId],
    queryFn: () =>
      getCoreEntityEmailActivityService(workspace!.id, entityType, entityId),
    enabled: !!entityId && !!workspace?.id,
  });

  const { data: coreEmailAccounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspace?.id],
    queryFn: () => getCoreEmailAccountsService(workspace!.id),
    enabled: !!workspace?.id,
  });

  const combinedItems = response?.data || [];

  // Handle delete
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteCoreEmailActivityService(id, workspace!.id);
      queryClient.invalidateQueries({
        queryKey: ['core-entity-emails', workspace?.id, entityType, entityId],
      });
      toast.success('Record removed');
    } catch {
      toast.error('Failed to remove record');
    }
  };

  if (!mounted) {
    return (
      <CardWidgetContainer
        title="Emails"
        hideHeaderBorder={true}
        icon={<Mail className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      >
        <div className="px-6 py-3">
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </div>
      </CardWidgetContainer>
    );
  }

  if (isLoading) {
    return (
      <CardWidgetContainer
        title="Emails"
        hideHeaderBorder={true}
        icon={<Mail className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      >
        <div className="px-6 py-3">
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </div>
      </CardWidgetContainer>
    );
  }

  return (
    <>
      <CardWidgetContainer
        title="Emails"
        hideHeaderBorder={true}
        icon={<Mail className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
        icon2={
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-sm text-blue-500 hover:text-blue-600"
            onClick={() => {
              setComposeRecipientEmail('');
              setIsComposeOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Send Mail
          </Button>
        }
      >
        <div className="px-6 py-3">
          {combinedItems.length === 0 ? (
            <div className="py-8 text-center">
              <Mail className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No email activity yet</p>
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto pr-1">
              <CardWidgetList>
                {combinedItems.map(
                  (
                    item: any, // eslint-disable-line @typescript-eslint/no-explicit-any
                  ) => (
                    <CardWidgetListItem
                      key={item.id}
                      className={cn(
                        item.status !== 'sent'
                          ? 'cursor-pointer'
                          : 'cursor-default',
                      )}
                      icon={
                        <div
                          className={cn(
                            'rounded-md p-2',
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
                      }
                      iconAlignTop={true}
                      title={
                        <span
                          onClick={() => {
                            setSelectedEmail(item);
                            setIsDetailOpen(true);
                          }}
                        >
                          {item.subject || '(No Subject)'}
                        </span>
                      }
                      badge={
                        <span
                          onClick={() => {
                            setSelectedEmail(item);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              'h-4 px-3 py-2.5 text-[10px]',
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
                              : item.status.charAt(0).toUpperCase() +
                                item.status.slice(1)}
                          </Badge>
                          {item.direction !== 'inbound' &&
                            item.status !== 'sent' && (
                              <span className="ml-1 text-[10px] text-blue-500 italic opacity-0 transition-opacity group-hover:opacity-100">
                                • Click to Edit
                              </span>
                            )}
                        </span>
                      }
                      content={
                        <span
                          onClick={() => {
                            setSelectedEmail(item);
                            setIsDetailOpen(true);
                          }}
                          className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400"
                          dangerouslySetInnerHTML={{ __html: item.html_body }}
                        />
                      }
                      metadata={
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
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
                              Due:{' '}
                              {new Date(item.scheduled_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      }
                      actions={
                        item.status !== 'sent' &&
                        item.direction !== 'inbound' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => handleDelete(e, item.id)}
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )
                      }
                    />
                  ),
                )}
              </CardWidgetList>
            </div>
          )}
        </div>
      </CardWidgetContainer>

      <CoreEmailDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        email={selectedEmail}
        onReply={(email) => {
          setSelectedEmail(email);
          setIsDetailOpen(false);
          setComposeRecipientEmail(
            email.direction === 'inbound' ? email.from_email : email.to_emails,
          );
          setIsComposeOpen(true);
        }}
      />

      <CoreEmailComposeDialog
        open={isComposeOpen}
        onOpenChange={(open) => {
          setIsComposeOpen(open);
          if (!open) {
            setComposeRecipientEmail('');
            // Refresh entity email list after compose closes (may have sent)
            queryClient.invalidateQueries({
              queryKey: [
                'core-entity-emails',
                workspace?.id,
                entityType,
                entityId,
              ],
            });
          }
        }}
        workspaceId={workspace?.id || ''}
        accounts={coreEmailAccounts}
        entityType={entityType}
        entityId={entityId}
        initialTo={composeRecipientEmail || entityEmail}
        templateContext={{
          entity_name: entityName,
          entity_email: entityEmail,
        }}
      />
    </>
  );
}

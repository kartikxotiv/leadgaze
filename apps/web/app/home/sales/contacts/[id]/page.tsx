'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
} from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getContactByIdService } from '~/services/contacts.service';
import { getWorkspaceEmailAccountService } from '~/services/email.service';

import { DeleteEntityDialog } from '../../../_components/delete-entity-dialog';
import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../../_components/entity-activity';
import { EntityCalls } from '../../../_components/entity-calls';
import { EntityEmails } from '../../../_components/entity-emails';
import { EntityNotes } from '../../../_components/entity-notes';
import { EmailLeadDialog } from '../../../leads/components/email-lead-dialog';
import { LogCallDialog } from '../../../leads/components/log-call-dialog';
import { ContactAssignees } from '../components/contact-assignees';
import { EditContactDialog } from '../components/edit-contact-dialog';

export default function ContactDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  const {
    data: contact,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => getContactByIdService(id),
    enabled: !!id,
  });

  const { data: user } = useUser();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const editPermission = usePermissionDetail('contacts', 'edit');
  const canEdit = useCanAccessData(editPermission, contact?.owner_id, user?.id);

  const contactEmailRecipients = useMemo(() => {
    if (!contact) return [];

    const name =
      `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
      contact.email ||
      'Contact';

    return [
      ...(contact.email
        ? [{ email: contact.email, name, label: 'Primary Email' }]
        : []),
      ...(contact.alt_email
        ? [{ email: contact.alt_email, name, label: 'Alt Email' }]
        : []),
    ];
  }, [contact]);

  const { data: workspaceEmailAccounts = [] } = useQuery({
    queryKey: ['workspace-email-accounts', workspace?.id],
    queryFn: () => getWorkspaceEmailAccountService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  if (isLoading) {
    return (
      <ModuleGuard module="contacts">
        <div className="flex h-screen items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      </ModuleGuard>
    );
  }

  if (error || !contact) {
    return (
      <ModuleGuard module="contacts">
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Contact Not Found</h1>
          <p className="text-muted-foreground">
            The contact you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Button asChild variant="outline">
            <Link href="/home/contacts">Back to Contacts</Link>
          </Button>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="contacts">
      <div className="bg-background border-b px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/home/contacts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLogCallDialogOpen(true)}
                className="p-3"
                title="Log a call"
              >
                <div className="flex items-center justify-center rounded-full bg-[#44bbb3] p-2">
                  <Phone className="h-3 w-3 text-white" />
                </div>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className={`flex h-8 w-8 items-center justify-center overflow-hidden p-0 ${
                contactEmailRecipients.length === 0 ? 'opacity-50' : ''
              }`}
              disabled={contactEmailRecipients.length === 0}
              onClick={() => setIsEmailDialogOpen(true)}
              title={
                contactEmailRecipients.length === 0
                  ? 'Contact has no email address'
                  : 'Send email to contact'
              }
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400">
                <Mail className="h-3.5 w-3.5 text-white" />
              </div>
            </Button>

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
              >
                Edit Contact
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-semibold text-white">
              {contact.first_name.charAt(0)}
              {contact.last_name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {contact.first_name} {contact.last_name}
              </h1>
              <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
                {contact.job_title && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {contact.job_title}
                  </span>
                )}
                {contact.account && (
                  <Link
                    href={`/home/accounts/${contact.account.id}`}
                    className="text-primary flex items-center gap-1 hover:underline"
                  >
                    <Building2 className="h-3 w-3" />
                    {contact.account.account_name}
                  </Link>
                )}
                <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>
                    Created on{' '}
                    {new Date(contact.created_at).toLocaleDateString(
                      undefined,
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      },
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageBody>
        <DeleteEntityDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityId={id}
          entityType="contact"
          entityName={`${contact.first_name} ${contact.last_name || ''}`}
          onSuccess={() => router.push('/home/contacts')}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Email
                  </p>
                  <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground h-4 w-4" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-sm hover:underline"
                    >
                      {contact.email || '-'}
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Alt Email
                  </p>
                  <div className="flex items-center gap-2">
                    <Mail className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm">{contact.alt_email || '-'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Phone
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <a
                      href={`tel:${contact.phone_number}`}
                      className="text-sm hover:underline"
                    >
                      {contact.phone_number || '-'}
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Mobile
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <a
                      href={`tel:${contact.mobile_number}`}
                      className="text-sm hover:underline"
                    >
                      {contact.mobile_number || '-'}
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Alt Phone
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <a
                      href={`tel:${contact.alt_phone}`}
                      className="text-sm hover:underline"
                    >
                      {contact.alt_phone || '-'}
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Language
                  </p>
                  <span className="text-sm">{contact.language || '-'}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Location
                  </p>
                  <div className="flex items-center gap-2">
                    <MapPin className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm">
                      {[contact.location, contact.timezone]
                        .filter(Boolean)
                        .join(' • ') || '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Department
                  </p>
                  <span className="text-sm">{contact.department || '-'}</span>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    LinkedIn
                  </p>
                  <div className="flex items-center gap-2">
                    <Linkedin className="text-muted-foreground h-4 w-4" />
                    {contact.linkedin_url ? (
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm break-all hover:underline"
                      >
                        {contact.linkedin_url}
                      </a>
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </div>
                </div>

                {contact.notes && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">
                      Private Notes
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {contact.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Assignees Section */}
            {workspace?.id && (
              <ContactAssignees contactId={id} workspaceId={workspace.id} />
            )}

            {/* Notes Section */}
            <EntityNotes entityType="contact" entityId={id} />

            {/* Activity Sections */}
            <EntityCalls entityType="contact" entityId={id} />
            <EntityEmails
              entityId={id}
              entityType="contact"
              entityName={`${contact.first_name} ${contact.last_name || ''}`.trim()}
              entityEmail={contact.email || undefined}
              recipientOptions={[
                ...(contact.email
                  ? [
                      {
                        email: contact.email,
                        name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
                        label: 'Primary Email',
                      },
                    ]
                  : []),
                ...(contact.alt_email
                  ? [
                      {
                        email: contact.alt_email,
                        name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
                        label: 'Alt Email',
                      },
                    ]
                  : []),
              ]}
            />
            <EntityReminders entityType="contact" entityId={id} />
            <EntityMeetings entityType="contact" entityId={id} />
            <EntityDocuments entityType="contact" entityId={id} />

            {/* Danger Zone */}
            {canAccess('contacts', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardHeader>
                  <CardTitle className="text-destructive text-lg"></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Delete Contact</p>
                      <p className="text-muted-foreground text-sm">
                        Once you delete a contact, there is no going back.
                        Please be certain.
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="destructive"
                              disabled={!canAccess('contacts', 'delete')}
                              onClick={() => setDeleteDialogOpen(true)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Contact
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!canAccess('contacts', 'delete') && (
                          <TooltipContent>
                            <p>You do not have permission to delete</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  System Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Owner
                  </p>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span className="text-sm">
                      {contact.owner?.name || '-'}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Created At
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Created By
                  </p>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span className="text-sm">
                      {contact.created_by_account?.name ||
                        contact.created_by ||
                        '-'}
                    </span>
                  </div>
                </div>
                {contact.twitter_handle && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium">
                        Social
                      </p>
                      <a
                        href={`https://twitter.com/${contact.twitter_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-blue-600 hover:underline"
                      >
                        Twitter: @{contact.twitter_handle.replace('@', '')}
                      </a>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>

      <EditContactDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        contact={contact}
      />

      {workspace?.id && (
        <LogCallDialog
          open={isLogCallDialogOpen}
          onOpenChange={setIsLogCallDialogOpen}
          onSuccess={async () => {
            setIsLogCallDialogOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ['calls', workspace.id, 'contact', id],
            });
          }}
          entityType="contact"
          entityId={id}
          workspaceId={workspace.id}
          defaultContactName={`${contact.first_name} ${contact.last_name || ''}`.trim()}
          defaultPhoneNumber={
            contact.phone_number || contact.mobile_number || contact.alt_phone
          }
        />
      )}

      <EmailLeadDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        leadName={`${contact.first_name} ${contact.last_name || ''}`.trim()}
        leadEmail={contact.email || undefined}
        recipientOptions={contactEmailRecipients}
        workspaceEmailAccounts={workspaceEmailAccounts}
        entityId={id}
        entityType="contact"
      />
    </ModuleGuard>
  );
}

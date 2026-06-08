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
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
} from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CustomInputForView } from '@kit/ui/custom-input-for-view';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';
import { Skeleton } from '@kit/ui/skeleton';
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

import { DeleteEntityDialog } from '../../_components/delete-entity-dialog';
import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityCalls } from '../../_components/entity-calls';
import { EntityEmails } from '../../_components/entity-emails';
import { EntityNotes } from '../../_components/entity-notes';
import { EmailLeadDialog } from '../../leads/components/email-lead-dialog';
import { LogCallDialog } from '../../leads/components/log-call-dialog';
import { ContactAssignees } from '../components/contact-assignees';
import { EditContactDialog } from '../components/edit-contact-dialog';

function ContactDetailsSkeleton() {
  return (
    <ModuleGuard module="contacts">
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-20 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
      </div>
      <PageBody className="pb-6 max-h-[calc(100vh-150px)] overflow-y-auto">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </ModuleGuard>
  );
}

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
    return <ContactDetailsSkeleton />;
  }

  if (error || !contact) {
    return (
      <ModuleGuard module="contacts">
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Contact Not Found</h1>
          <p className="text-muted-foreground">
            The contact you&apos;re looking for doesn&apos;t exist or you don&apos;t have
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
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
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

      <PageBody className="pb-6 max-h-[calc(100vh-150px)] overflow-y-auto">
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

            <CardWidgetContainer
              title="Details"
              icon={
                <User className="text-leadgaze-dark h-5 w-5 dark:text-white" />
              }
            >
              <div className="flex-1">
                <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
                  {contact.email && (
                    <CustomInputForView
                      label="Email"
                      labelIcon={
                        <Mail className="text-muted-foreground h-4 w-4" />
                      }
                      value={
                        <a
                          href={`mailto:${contact.email}`}
                          className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.email}
                        </a>
                      }
                    />
                  )}

                  {contact.alt_email && (
                    <CustomInputForView
                      label="Alt Email"
                      labelIcon={
                        <Mail className="text-muted-foreground h-4 w-4" />
                      }
                      value={
                        <a
                          href={`mailto:${contact.alt_email}`}
                          className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.alt_email}
                        </a>
                      }
                    />
                  )}

                  {contact.phone_number && (
                    <CustomInputForView
                      label="Phone"
                      labelIcon={
                        <Phone className="text-muted-foreground h-4 w-4" />
                      }
                      value={
                        <a
                          href={`tel:${contact.phone_number}`}
                          className="block text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.phone_number}
                        </a>
                      }
                    />
                  )}

                  {contact.mobile_number && (
                    <CustomInputForView
                      label="Mobile"
                      labelIcon={
                        <Phone className="text-muted-foreground h-4 w-4" />
                      }
                      value={
                        <a
                          href={`tel:${contact.mobile_number}`}
                          className="block text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.mobile_number}
                        </a>
                      }
                    />
                  )}

                  {contact.alt_phone && (
                    <CustomInputForView
                      label="Alt Phone"
                      labelIcon={
                        <Phone className="text-muted-foreground h-4 w-4" />
                      }
                      value={
                        <a
                          href={`tel:${contact.alt_phone}`}
                          className="block text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.alt_phone}
                        </a>
                      }
                    />
                  )}

                  {contact.language && (
                    <CustomInputForView
                      label="Language"
                      value={contact.language}
                    />
                  )}

                  {(contact.location || contact.timezone) && (
                    <CustomInputForView
                      label="Location"
                      labelIcon={
                        <MapPin className="text-muted-foreground h-4 w-4" />
                      }
                      value={[contact.location, contact.timezone]
                        .filter(Boolean)
                        .join(' • ')}
                    />
                  )}

                  {contact.department && (
                    <CustomInputForView
                      label="Department"
                      value={contact.department}
                    />
                  )}

                  {contact.linkedin_url && (
                    <CustomInputForView
                      label="LinkedIn"
                      labelIcon={
                        <Linkedin className="text-muted-foreground h-4 w-4" />
                      }
                      value={
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.linkedin_url}
                        </a>
                      }
                    />
                  )}

                  {contact.notes && (
                    <CustomInputForView
                      label="Private Notes"
                      value={contact.notes}
                      as="textarea"
                      className="col-span-2"
                    />
                  )}
                </CardContent>
              </div>
            </CardWidgetContainer>

            {/* Notes Section */}
            <EntityNotes entityType="contact" entityId={id} />

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

            {/* Contact Assignees Section */}
            {workspace?.id && (
              <ContactAssignees contactId={id} workspaceId={workspace.id} />
            )}

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

'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Globe,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';

import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getContactByIdService } from '~/services/contacts.service';

import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityNotes } from '../../_components/entity-notes';
import { PublicPrivateToggle } from '../../_components/public-private-toggle';
import { ContactAssignees } from '../components/contact-assignees';
import { EditContactDialog } from '../components/edit-contact-dialog';

export default function ContactDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
  const { currentWorkspace: workspace } = useRBAC();
  const editPermission = usePermissionDetail('contacts', 'edit');
  const canEdit = useCanAccessData(editPermission, contact?.owner_id, user?.id);

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            disabled={!canEdit}
            title={
              !canEdit ? 'You do not have permission to edit this contact' : ''
            }
          >
            Edit Contact
          </Button>
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <PageBody>
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

            {/* Public/Private Toggle */}
            {workspace?.id && contact && (
              <PublicPrivateToggle
                entityType="contact"
                entityId={id}
                isPublic={contact.is_public ?? true}
                createdBy={contact.created_by}
                workspaceId={workspace.id}
              />
            )}

            {/* Notes Section */}
            <EntityNotes entityType="contact" entityId={id} />

            {/* Activity Sections */}
            <EntityReminders entityType="contact" entityId={id} />
            <EntityMeetings entityType="contact" entityId={id} />
            <EntityDocuments entityType="contact" entityId={id} />
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
                {(contact.linkedin_url || contact.twitter_handle) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium">
                        Social
                      </p>
                      {contact.linkedin_url && (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:underline"
                        >
                          LinkedIn Profile: @
                          {contact.linkedin_url.replace('@', '')}
                        </a>
                      )}
                      {contact.twitter_handle && (
                        <a
                          href={`https://twitter.com/${contact.twitter_handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:underline"
                        >
                          Twitter: @{contact.twitter_handle.replace('@', '')}
                        </a>
                      )}
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
    </ModuleGuard>
  );
}

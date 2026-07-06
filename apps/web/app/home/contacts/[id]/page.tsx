'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  Edit2,
  FileText,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailComposeDialog } from '@kit/core/pages';
import { getCoreEmailAccountsService } from '@kit/core/services';
import { useLocalization } from '~/lib/localization/localization-provider';
import { useUser } from '@kit/supabase/hooks/use-user';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@kit/ui/accordion';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { DetailHeader } from '@kit/ui/detail-header';
import { DetailInfoList, DetailInfoRow } from '@kit/ui/detail-info-row';
import { PageBody } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { cn } from '@kit/ui/utils';

import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';
import {
  assignContactToUser,
  getContactAssignees,
} from '~/services/contact-assignees.service';
import { getContactByIdService } from '~/services/contacts.service';

import { DeleteEntityDialog } from '../../_components/delete-entity-dialog';
import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityCalls } from '../../_components/entity-calls';
import { EntityEmails } from '../../_components/entity-emails';
import { EntityNotes } from '../../_components/entity-notes';
import { EntityTasks } from '../../_components/entity-tasks';
import { AssignUserModal } from '../../leads/components/assign-user-modal';
import { LogCallDialog } from '../../leads/components/log-call-dialog';
import { ContactAssignees } from '../components/contact-assignees';
import { EditContactDialog } from '../components/edit-contact-dialog';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';

function ContactDetailsSkeleton() {
  return (
    <ModuleGuard module="contacts">
      <div className="flex h-full flex-col">
        <div className="px-6 pt-4 pb-2">
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <PageBody>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <DetailHeader
                avatar={<Skeleton className="h-16 w-16 rounded-full" />}
                title={<Skeleton className="h-6 w-48" />}
                subtitle={
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                }
                actions={
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                }
              />
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
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
      </div>
    </ModuleGuard>
  );
}

export default function ContactDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const { formatDate } = useLocalization();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>('');

  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const canManageEmail = canAccess('emails', 'manage_email');
  const { data: user } = useUser();

  const {
    data: contact,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => getContactByIdService(id),
    enabled: !!id,
  });

  const { canView } = useFieldPermissions({
    entityType: 'contacts',
    workspaceId: workspace?.id,
    enabled: !!workspace?.id,
  });

  const { fields = [] } = useDynamicColumns({
    entityType: 'contacts',
    workspaceId: workspace?.id,
    userId: user?.id,
    enabled: !!workspace?.id,
  });

  const customFieldsToShow = useMemo(() => {
    if (!contact) return [];
    const contactCustom = (contact.custom_fields as Record<string, unknown>) || {};
    return fields.filter(
      (f) =>
        !f.is_system &&
        canView(f.field_key) &&
        contactCustom[f.field_key] !== undefined &&
        contactCustom[f.field_key] !== null &&
        contactCustom[f.field_key] !== '',
    );
  }, [fields, canView, contact]);

  // Page-level assign modal (works even when accordion is collapsed)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const { data: pageAssignees = [] } = useQuery({
    queryKey: ['contact-assignees', id],
    queryFn: async () => {
      const res = await getContactAssignees(id);
      return (res?.data || res || []) as Array<{
        id: string;
        assigned_to_user_id: string;
        assignee_name?: string;
        assignee_email?: string;
        assignee_picture?: string;
        is_primary_assignee: boolean;
      }>;
    },
    enabled: !!id,
  });
  const pageAssignMutation = useMutation({
    mutationFn: (userId: string) =>
      assignContactToUser(id, { assigned_to_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-assignees', id] });
      toast.success('User assigned to contact');
      setIsAssignModalOpen(false);
    },
    onError: (error: unknown) => {
      const response = (
        error as { response?: { data?: { message?: unknown } } }
      )?.response;
      const message =
        typeof response?.data?.message === 'string'
          ? response.data.message
          : 'Failed to assign user';
      toast.error(message);
    },
  });

  const editPermission = usePermissionDetail('contacts', 'edit');
  const canEdit = useCanAccessData(editPermission, contact?.owner_id, user?.id);

  const { data: coreEmailAccounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspace?.id],
    queryFn: () => getCoreEmailAccountsService(workspace!.id),
    enabled: canManageEmail && !!workspace?.id,
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
            The contact you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Button asChild variant="outline">
            <Link href="/home/sales/contacts">Back to Contacts</Link>
          </Button>
        </div>
      </ModuleGuard>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name || ''}`.trim();

  return (
    <ModuleGuard module="contacts">
      <div className="flex flex-wrap items-start gap-2 pt-4 pb-2 sm:flex-nowrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="border-leadgaze-border border p-0"
          >
            <Link href="/home/sales/contacts">
              <ArrowLeft className="mr-2 ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">Contact details</h1>
            <p className="text-leadgaze-muted text-sm">
              View and edit contact information
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLogCallDialogOpen(true)}
                    className="gap-2"
                    title="Log a call"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Log Call</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Log Call</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {canManageEmail && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-2 ${!contact.email ? 'opacity-50' : ''}`}
                    disabled={!contact.email}
                    onClick={() => contact.email && setIsEmailDialogOpen(true)}
                    title={
                      !contact.email
                        ? 'Contact has no email address'
                        : 'Send email to contact'
                    }
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Send Email</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  {!contact.email ? 'Contact has no email' : 'Send Email'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {canEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Profile</span>
            </Button>
          )}
        </div>
      </div>

      <PageBody className="pb-6 lg:overflow-hidden">
        <DeleteEntityDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityId={id}
          entityType="contact"
          entityName={fullName}
          onSuccess={() => router.push('/home/sales/contacts')}
        />
        <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
          {/* Main Content */}
          <div className="w-full space-y-4 lg:w-[65%] lg:overflow-y-auto">
            <DetailHeader
              avatar={
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-semibold text-white">
                  {contact.first_name.charAt(0)}
                  {contact.last_name?.charAt(0)}
                </div>
              }
              title={fullName}
              subtitle={
                <>
                  {contact.job_title && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {contact.job_title}
                    </span>
                  )}
                  {contact.account && (
                    <Link
                      href={`/home/sales/accounts/${contact.account.id}`}
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
                      Created by {contact.created_by_account?.name || 'Unknown'} on {formatDate(contact.created_at)}
                    </span>
                  </div>
                  {contact.updated_by && (
                    <>
                      <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          Updated by {contact.updated_by_account?.name || 'Unknown'} on {formatDate(contact.updated_at)}
                        </span>
                      </div>
                    </>
                  )}
                </>
              }
              email={contact.email || undefined}
            />

            {/* Tabs Section */}
            <Tabs
              defaultValue={canManageEmail ? 'email' : 'notes'}
              className="space-y-4"
            >
              <TabsList className="mb-2 h-auto w-full justify-start gap-3 overflow-x-auto rounded-none border-b bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden">
                {canManageEmail && (
                  <TabsTrigger
                    value="email"
                    className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger
                  value="meetings"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Meetings
                </TabsTrigger>
                <TabsTrigger
                  value="calls"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Calls
                </TabsTrigger>
                <TabsTrigger
                  value="reminders"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Reminders
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {canManageEmail && (
                <TabsContent
                  value="email"
                  className="max-h-[500px] overflow-y-auto"
                >
                  <EntityEmails
                    entityId={id}
                    entityType="contact"
                    entityName={fullName}
                    entityEmail={contact.email || undefined}
                    recipientOptions={[
                      ...(contact.email
                        ? [
                          {
                            email: contact.email,
                            name: fullName,
                            label: 'Primary Email',
                          },
                        ]
                        : []),
                      ...(contact.alt_email
                        ? [
                          {
                            email: contact.alt_email,
                            name: fullName,
                            label: 'Alt Email',
                          },
                        ]
                        : []),
                    ]}
                  />
                </TabsContent>
              )}

              <TabsContent
                value="notes"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityNotes entityType="contact" entityId={id} />
              </TabsContent>

              <TabsContent
                value="meetings"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityMeetings entityType="contact" entityId={id} />
              </TabsContent>

              <TabsContent
                value="calls"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityCalls entityType="contact" entityId={id} />
              </TabsContent>

              <TabsContent
                value="reminders"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityReminders entityType="contact" entityId={id} />
              </TabsContent>

              <TabsContent
                value="documents"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityDocuments entityType="contact" entityId={id} />
              </TabsContent>

              <TabsContent
                value="tasks"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityTasks entityType="contact" entityId={id} />
              </TabsContent>

              <TabsContent value="activity">
                <CardWidgetContainer
                  title="Activity"
                  hideHeaderBorder={true}
                  icon={<Clock className="text-leadgaze-dark h-5 w-5 dark:text-white" />}>
                  <CardContent className="px-6 py-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-900">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Contact Created
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(contact.created_at)}
                          </p>
                        </div>
                      </div>
                      {contact.updated_at &&
                        contact.updated_at !== contact.created_at && (
                          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-900">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Contact Updated
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(contact.updated_at)}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </CardWidgetContainer>
              </TabsContent>
            </Tabs>

            {/* Danger Zone */}
            {canAccess('contacts', 'delete') && (
              <Card className="border-destructive/50 hidden border-solid lg:block">
                <CardContent>
                  <div className="mt-6 flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-2 space-y-1">
                      <p className="font-medium dark:text-white">
                        Delete Contact
                      </p>
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
          <div className="w-full space-y-4 lg:w-[35%] lg:overflow-y-auto">
            {/* Accordion Sections */}
            <Accordion
              type="single"
              collapsible
              className="space-y-2"
              value={openAccordion}
              onValueChange={setOpenAccordion}
            >
              {/* Contact Info */}
              <AccordionItem
                value="contact"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="primary-heading text-leadgaze-dark flex items-center gap-2 dark:text-white">
                    <User className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    Contact Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <DetailInfoList>

                    {canView('email') && <DetailInfoRow
                      icon={<Mail className="h-5 w-5" />}
                      label="Email"
                      value={
                        contact.email ? (<a
                          href={`mailto:${contact.email}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.email}
                        </a>) : '-'
                      }
                    />}

                    {canView('alt_email') && <DetailInfoRow
                      icon={<Mail className="h-5 w-5" />}
                      label="Alt Email"
                      value={
                        contact.alt_email ? (<a
                          href={`mailto:${contact.alt_email}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.alt_email}
                        </a>) : '-'
                      }
                    />}

                    {canView('phone') && <DetailInfoRow
                      icon={<Phone className="h-5 w-5" />}
                      label="Phone"
                      value={
                        contact.phone_number ? (<a
                          href={`tel:${contact.phone_number}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.phone_number}
                        </a>) : '-'
                      }
                    />}

                    {canView('mobile') && <DetailInfoRow
                      icon={<Phone className="h-5 w-5" />}
                      label="Mobile"
                      value={
                        contact.mobile_number ? (<a
                          href={`tel:${contact.mobile_number}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.mobile_number}
                        </a>) : '-'
                      }
                    />}

                    {canView('alt_phone') && <DetailInfoRow
                      icon={<Phone className="h-5 w-5" />}
                      label="Alt Phone"
                      value={
                        contact.alt_phone ? (<a
                          href={`tel:${contact.alt_phone}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.alt_phone}
                        </a>) : '-'
                      }
                    />}

                    {canView('language') && <DetailInfoRow
                      icon={<Globe className="h-5 w-5" />}
                      label="Language"
                      value={contact.language || '-'}
                    />}


                    {(canView('location') || canView('timezone')) && <DetailInfoRow
                      icon={<MapPin className="h-5 w-5" />}
                      label="Location"
                      value={(contact.location || contact.timezone) ? ([contact.location, contact.timezone]
                        .filter(Boolean)
                        .join(' • ')) : '-'}
                    />}

                    {canView('department') && <DetailInfoRow
                      icon={<FileText className="h-5 w-5" />}
                      label="Department"
                      value={contact.department || '-'}
                    />}
                    {canView('linkedin') && <DetailInfoRow
                      icon={<Linkedin className="h-5 w-5" />}
                      label="LinkedIn"
                      value={
                        contact.linkedin_url ? (<a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contact.linkedin_url}
                        </a>) : '-'}
                    />}

                    {canView('notes') && <DetailInfoRow
                      icon={<FileText className="h-5 w-5" />}
                      label="Notes"
                      value={contact.notes || '-'}
                    />}
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>

              {/* Account */}
              {contact.account && (
                <AccordionItem
                  value="account"
                  className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="primary-heading text-leadgaze-dark flex items-center gap-2 dark:text-white">
                      <Building2 className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                      Account
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <DetailInfoList>
                      <DetailInfoRow
                        icon={<Building2 className="h-5 w-5" />}
                        label="Account"
                        value={
                          contact.account.account_name ? (<Link
                            href={`/home/sales/accounts/${contact.account.id}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {contact.account.account_name}
                          </Link>) : '-'}
                      />
                    </DetailInfoList>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Additional Data (Custom Fields) */}
              {customFieldsToShow.length > 0 && (
                <AccordionItem
                  value="additional"
                  className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                      <FileText className="text-leadgaze-dark h-4 w-4 dark:text-white" />
                      Additional Data
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <DetailInfoList>
                      {customFieldsToShow.map((field) => {
                        const val = (contact.custom_fields as Record<string, unknown>)?.[field.field_key];
                        return (
                          <DetailInfoRow
                            key={field.id}
                            label={field.field_label}
                            value={val === true ? 'Yes' : val === false ? 'No' : String(val ?? '-')}
                          />
                        );
                      })}
                    </DetailInfoList>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Assigned Team Members */}
              {workspace?.id && (
                <AccordionItem
                  value="assignees"
                  className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <AccordionTrigger className="hover:no-underline">
                      <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                        <Users className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                        Assigned Members
                      </span>
                    </AccordionTrigger>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAssignModalOpen(true);
                      }}
                      className="focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-1 gap-2 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Assign Member</span>
                    </button>
                  </div>
                  <AccordionContent className="px-4 pb-4">
                    <ContactAssignees
                      contactId={id}
                      workspaceId={workspace.id}
                      embedded
                    />
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* System Info */}
              <AccordionItem
                value="system"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="primary-heading text-leadgaze-dark flex items-center gap-2 dark:text-white">
                    <Clock className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    System Info
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <DetailInfoList>
                    <DetailInfoRow
                      icon={<User className="h-5 w-5" />}
                      label="Owner"
                      value={contact.owner?.name || '-'}
                    />
                    <DetailInfoRow
                      icon={<Calendar className="h-5 w-5" />}
                      label="Created At"
                      value={formatDate(contact.created_at)}
                    />
                    <DetailInfoRow
                      icon={<User className="h-5 w-5" />}
                      label="Created By"
                      value={
                        contact.created_by_account?.name ||
                        contact.created_by ||
                        '-'
                      }
                    />
                    {contact.twitter_handle && (
                      <DetailInfoRow
                        icon={<Globe className="h-5 w-5" />}
                        label="Twitter"
                        value={
                          <a
                            href={`https://twitter.com/${contact.twitter_handle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            @{contact.twitter_handle.replace('@', '')}
                          </a>
                        }
                      />
                    )}
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Danger Zone */}
          <div className="w-full lg:hidden">
            {canAccess('contacts', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardContent>
                  <div className="mt-6 flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-2 space-y-1">
                      <p className="font-medium dark:text-white">
                        Delete Contact
                      </p>
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
          defaultContactName={fullName}
          defaultPhoneNumber={
            contact.phone_number || contact.mobile_number || contact.alt_phone
          }
        />
      )}

      {canManageEmail && (
        <CoreEmailComposeDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          workspaceId={workspace?.id || ''}
          accounts={coreEmailAccounts}
          entityType="contact"
          entityId={id}
          initialTo={contact.email || undefined}
          templateContext={{
            contact_name: fullName,
            contact_email: contact.email,
          }}
        />
      )}

      {/* Page-level Assign User Modal (works from accordion header even when collapsed) */}
      {workspace?.id && (
        <AssignUserModal
          isOpen={isAssignModalOpen}
          onOpenChange={setIsAssignModalOpen}
          leadId={id}
          workspaceId={workspace.id}
          currentAssignees={
            pageAssignees as Parameters<
              typeof AssignUserModal
            >[0]['currentAssignees']
          }
          onAssign={(userId) => pageAssignMutation.mutate(userId)}
          isLoading={pageAssignMutation.isPending}
        />
      )}
    </ModuleGuard>
  );
}

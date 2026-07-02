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
  DollarSign,
  Edit2,
  FileText,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Plus,
  Tag,
  Trash2,
  User,
  Users,
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
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader } from '@kit/ui/card';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
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

import { CreateContactDialog } from '~/home/contacts/components/create-contact-dialog';
import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';
import {
  assignAccountToUser,
  getAccountAssignees,
} from '~/services/account-assignees.service';
import { getAccountByIdService } from '~/services/accounts.service';
import { type Contact, getContactsService } from '~/services/contacts.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

import { DeleteEntityDialog } from '../../_components/delete-entity-dialog';
import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityCalls } from '../../_components/entity-calls';
import { EntityEmails } from '../../_components/entity-emails';
import { EntityNotes } from '../../_components/entity-notes';
import { AssignUserModal } from '../../leads/components/assign-user-modal';
import { LogCallDialog } from '../../leads/components/log-call-dialog';
import { OpportunityDialog } from '../../opportunities/components/opportunity-dialog';
import { AccountAssignees } from '../components/account-assignees';
import { EditAccountDialog } from '../components/edit-account-dialog';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';

function AccountDetailsSkeleton() {
  return (
    <ModuleGuard module="accounts">
      <div className="flex h-full flex-col">
        <div className="px-6 pt-4 pb-2">
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <PageBody>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <DetailHeader
                avatar={<Skeleton className="h-16 w-16 rounded-lg" />}
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
                  </div>
                }
              />
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2">
                  {[...Array(6)].map((_, i) => (
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

export default function AccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const { formatDate, formatCurrency } = useLocalization();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isOpportunityDialogOpen, setIsOpportunityDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>('');

  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const canManageEmail = canAccess('emails', 'manage_email');
  const rbacCanAccess = canAccess;
  const { data: user } = useUser();

  const {
    data: account,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['account', id],
    queryFn: () => getAccountByIdService(id),
    enabled: !!id,
  });

  const { canView } = useFieldPermissions({
    entityType: 'accounts',
    workspaceId: workspace?.id,
    enabled: !!workspace?.id,
  });

  const { fields = [] } = useDynamicColumns({
    entityType: 'accounts',
    workspaceId: workspace?.id,
    userId: user?.id,
    enabled: !!workspace?.id,
  });

  const customFieldsToShow = useMemo(() => {
    if (!account) return [];
    const accountCustom = (account.custom_fields as Record<string, unknown>) || {};
    return fields.filter(
      (f) =>
        !f.is_system &&
        canView(f.field_key) &&
        accountCustom[f.field_key] !== undefined &&
        accountCustom[f.field_key] !== null &&
        accountCustom[f.field_key] !== '',
    );
  }, [fields, canView, account]);

  // Page-level assign modal (works even when accordion is collapsed)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const { data: pageAssignees = [] } = useQuery({
    queryKey: ['account-assignees', id],
    queryFn: async () => {
      const res = await getAccountAssignees(id);
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
      assignAccountToUser(id, { assigned_to_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account-assignees', id] });
      toast.success('User assigned to account');
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



  const workspaceId = account?.workspace_id;

  const { data: contactsData } = useQuery({
    queryKey: ['contacts', 'account', id],
    queryFn: () =>
      getContactsService({ workspaceId, accountId: id, limit: 1000 }),
    enabled: !!workspaceId && !!id,
  });

  const contacts = contactsData?.data || [];
  const accountEmailRecipients = useMemo(
    () =>
      contacts.flatMap((contact: Contact) => {
        const name =
          `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
          contact.email ||
          'Contact';

        return [
          ...(contact.email
            ? [
              {
                email: contact.email,
                name,
                label: 'Primary Email',
              },
            ]
            : []),
          ...(contact.alt_email
            ? [
              {
                email: contact.alt_email,
                name,
                label: 'Alt Email',
              },
            ]
            : []),
        ];
      }),
    [contacts],
  );

  const editPermission = usePermissionDetail('accounts', 'edit');
  const canEdit = useCanAccessData(editPermission, account?.owner_id, user?.id);

  const { data: opportunitiesData } = useQuery({
    queryKey: ['opportunities', 'account', id],
    queryFn: () => getOpportunitiesService({ workspaceId, accountId: id }),
    enabled: !!workspaceId && !!id,
  });

  const opportunities = opportunitiesData?.data || [];

  const { data: coreEmailAccounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspace?.id],
    queryFn: () => getCoreEmailAccountsService(workspace!.id),
    enabled: canManageEmail && !!workspace?.id,
  });

  if (isLoading) {
    return <AccountDetailsSkeleton />;
  }

  if (error || !account) {
    return (
      <ModuleGuard module="accounts">
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Account Not Found</h1>
          <p className="text-muted-foreground">
            The account you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Button asChild variant="outline">
            <Link href="/home/sales/accounts">Back to Accounts</Link>
          </Button>
        </div>
      </ModuleGuard>
    );
  }

  const billingAddress = [
    account.billing_street,
    account.billing_city,
    account.billing_state,
    account.billing_postal_code,
    account.billing_country,
  ]
    .filter(Boolean)
    .join(', ');

  const shippingAddress = [
    account.shipping_street,
    account.shipping_city,
    account.shipping_state,
    account.shipping_postal_code,
    account.shipping_country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <ModuleGuard module="accounts">
      <div className="flex flex-wrap items-start gap-2 pt-4 pb-2 sm:flex-nowrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="border-leadgaze-border border p-0"
          >
            <Link href="/home/sales/accounts">
              <ArrowLeft className="mr-2 ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">Account details</h1>
            <p className="text-leadgaze-muted text-sm">
              View and edit account information
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
                    className={`gap-2 ${accountEmailRecipients.length === 0 ? 'opacity-50' : ''}`}
                    disabled={accountEmailRecipients.length === 0}
                    onClick={() =>
                      accountEmailRecipients.length > 0 &&
                      setIsEmailDialogOpen(true)
                    }
                    title={
                      accountEmailRecipients.length === 0
                        ? 'Account has no contact email addresses'
                        : 'Send email to account contact'
                    }
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Send Email</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  {accountEmailRecipients.length === 0
                    ? 'No emails available'
                    : 'Send Email'}
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
          entityType="account"
          entityName={account.account_name}
          onSuccess={() => router.push('/home/sales/accounts')}
        />
        <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
          {/* Main Content */}
          <div className="w-full space-y-4 lg:w-[65%] lg:overflow-y-auto">
            <DetailHeader
              avatar={
                <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg">
                  <Building2 className="text-primary h-8 w-8" />
                </div>
              }
              title={account.account_name}
              subtitle={
                <>
                  {account.industry && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {account.industry.industry_name}
                    </span>
                  )}
                  {account.website && (
                    <a
                      href={account.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary flex items-center gap-1 hover:underline"
                    >
                      <Globe className="h-3 w-3" />
                      {account.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      Created by {account.created_by_account?.name || 'Unknown'} on {formatDate(account.created_at)}
                    </span>
                  </div>
                  {account.updated_by && (
                    <>
                      <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          Updated by {account.updated_by_account?.name || 'Unknown'} on {formatDate(account.updated_at)}
                        </span>
                      </div>
                    </>
                  )}
                </>
              }
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
                    entityType="account"
                    entityName={account.account_name}
                    recipientOptions={accountEmailRecipients}
                  />
                </TabsContent>
              )}

              <TabsContent
                value="notes"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityNotes entityType="account" entityId={id} />
              </TabsContent>

              <TabsContent
                value="meetings"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityMeetings entityType="account" entityId={id} />
              </TabsContent>

              <TabsContent
                value="calls"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityCalls entityType="account" entityId={id} />
              </TabsContent>

              <TabsContent
                value="reminders"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityReminders entityType="account" entityId={id} />
              </TabsContent>

              <TabsContent
                value="documents"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityDocuments entityType="account" entityId={id} />
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
                            Account Created
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(account.created_at)}
                          </p>
                        </div>
                      </div>
                      {account.updated_at &&
                        account.updated_at !== account.created_at && (
                          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-900">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Account Updated
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(account.updated_at)}
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
            {rbacCanAccess('accounts', 'delete') && (
              <Card className="border-destructive/50 hidden border-solid lg:block">
                <CardContent>
                  <div className="mt-6 flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-2 space-y-1">
                      <p className="font-medium dark:text-white">
                        Delete Account
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Once you delete an account, there is no going back.
                        Please be certain.
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="destructive"
                              disabled={!rbacCanAccess('accounts', 'delete')}
                              onClick={() => setDeleteDialogOpen(true)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Account
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!rbacCanAccess('accounts', 'delete') && (
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
              {/* Account Details */}
              <AccordionItem
                value="details"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="primary-heading text-leadgaze-dark flex items-center gap-2 dark:text-white">
                    <Building2 className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    Account Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <DetailInfoList>

                    {canView('phone') && <DetailInfoRow
                      icon={<Phone className="h-5 w-5" />}
                      label="Phone"
                      value={
                        account.phone_number ? (<a
                          href={`tel:${account.phone_number}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {account.phone_number}
                        </a>) : '-'
                      }
                    />}


                    {canView('employee_count') && <DetailInfoRow
                      icon={<Users className="h-5 w-5" />}
                      label="Employees"
                      value={(account.company_size || account.employee_count) ? (account.company_size || account.employee_count) : '-'}
                    />}

                    {canView('annual_revenue') && <DetailInfoRow
                      icon={<DollarSign className="h-5 w-5" />}
                      label="Revenue"
                      value={formatCurrency(account.annual_revenue, 'USD')}
                    />}

                    {canView('account_type') && <DetailInfoRow
                      icon={<Tag className="h-5 w-5" />}
                      label="Type"
                      value={
                        account.account_type ? (<span className="capitalize">
                          {account.account_type_relation.status_name}
                        </span>) : '-'
                      }
                    />}


                    {canView('linkedin') && <DetailInfoRow
                      icon={<Linkedin className="h-5 w-5" />}
                      label="LinkedIn"
                      value={
                        account.linkedin_url ? (<a
                          href={account.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {account.linkedin_url}
                        </a>) : '-'
                      }
                    />}


                    {canView('description') && <DetailInfoRow
                      icon={<FileText className="h-5 w-5" />}
                      label="Description"
                      value={account.description || '-'}
                    />}


                    {canView('billing_street') && <DetailInfoRow
                      icon={<MapPin className="h-5 w-5" />}
                      label="Billing"
                      value={billingAddress || '-'}
                    />}

                    {canView('shipping_street') && <DetailInfoRow
                      icon={<MapPin className="h-5 w-5" />}
                      label="Shipping"
                      value={shippingAddress || '-'}
                    />}

                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>

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
                        const val = (account.custom_fields as Record<string, unknown>)?.[field.field_key];
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

              {/* Contacts */}
              <AccordionItem
                value="contacts"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                      <Users className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                      Contacts
                    </span>
                  </AccordionTrigger>
                  {rbacCanAccess('accounts', 'add_contact') && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsContactDialogOpen(true);
                      }}
                      className="focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-1 gap-2 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Contact</span>
                    </button>
                  )}
                </div>
                <AccordionContent className="px-4 pb-4">
                  {rbacCanAccess('accounts', 'view_contacts') ? (
                    contacts && contacts.length > 0 ? (
                      <CardWidgetList>
                        {contacts.map((contact: any) => (
                          <CardWidgetListItem
                            key={contact.id}
                            icon={
                              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
                                {contact.first_name[0]}
                                {contact.last_name?.[0]}
                              </div>
                            }
                            title={`${contact.first_name} ${contact.last_name || ''}`}
                            subtitle={
                              <span>
                                {contact.job_title}
                                {contact.job_title &&
                                  contact.department &&
                                  ' • '}
                                {contact.department}
                              </span>
                            }
                            metadata={
                              <span>
                                {contact.email}
                                {contact.email && contact.phone_number && ' • '}
                                {contact.phone_number}
                              </span>
                            }
                            actions={
                              rbacCanAccess('contacts', 'view') && (
                                <Button size="sm" variant="ghost" asChild>
                                  <Link
                                    href={`/home/sales/contacts/${contact.id}`}
                                  >
                                    View
                                  </Link>
                                </Button>
                              )
                            }
                          />
                        ))}
                      </CardWidgetList>
                    ) : (
                      <div className="text-muted-foreground py-6 text-center text-sm">
                        No contacts associated with this account.
                      </div>
                    )
                  ) : (
                    <div className="text-muted-foreground py-6 text-center text-sm">
                      You do not have permission to view contacts.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Opportunities */}
              <AccordionItem
                value="opportunities"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                      <Briefcase className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                      Opportunities
                    </span>
                  </AccordionTrigger>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpportunityDialogOpen(true);
                    }}
                    className="focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-1 gap-2 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>New Opportunity</span>
                  </button>
                </div>
                <AccordionContent className="px-4 pb-4">
                  {rbacCanAccess('accounts', 'view_opportunities') ? (
                    opportunities && opportunities.length > 0 ? (
                      <CardWidgetList>
                        {opportunities.map((opp: any) => (
                          <CardWidgetListItem
                            key={opp.id}
                            title={opp.opportunity_name}
                            badge={
                              opp.stage && (
                                <Badge
                                  variant="outline"
                                  className="h-5 text-[10px]"
                                >
                                  {opp.stage.status_name}
                                </Badge>
                              )
                            }
                            subtitle={
                              <span>
                                {formatCurrency(opp.amount, opp.currency || 'USD')}
                              </span>
                            }
                            metadata={
                              <span>
                                {opp.expected_close_date &&
                                  `Expected Close: ${formatDate(opp.expected_close_date)}`}
                                {opp.expected_close_date &&
                                  opp.probability !== undefined &&
                                  ' • '}
                                {opp.probability !== undefined &&
                                  `Probability: ${opp.probability}%`}
                              </span>
                            }
                            actions={
                              rbacCanAccess('opportunities', 'view') && (
                                <Button size="sm" variant="ghost" asChild>
                                  <Link
                                    href={`/home/sales/opportunities/${opp.id}`}
                                  >
                                    View
                                  </Link>
                                </Button>
                              )
                            }
                          />
                        ))}
                      </CardWidgetList>
                    ) : (
                      <div className="text-muted-foreground py-6 text-center text-sm">
                        No opportunities associated with this account.
                      </div>
                    )
                  ) : (
                    <div className="text-muted-foreground py-6 text-center text-sm">
                      You do not have permission to view opportunities.
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

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
                    <AccountAssignees
                      accountId={id}
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
                      value={account.owner?.name || '-'}
                    />
                    <DetailInfoRow
                      icon={<Calendar className="h-5 w-5" />}
                      label="Created At"
                      value={account.created_at ? formatDate(account.created_at) : '-'}
                    />
                    <DetailInfoRow
                      icon={<Calendar className="h-5 w-5" />}
                      label="Updated"
                      value={account.updated_at ? formatDate(account.updated_at) : '-'}
                    />

                    <DetailInfoRow
                      icon={<Globe className="h-5 w-5" />}
                      label="Twitter"
                      value={
                        account.twitter_handle ? (<a
                          href={`https://twitter.com/${account.twitter_handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          @{account.twitter_handle.replace('@', '')}
                        </a>) : '-'
                      }
                    />
                    <DetailInfoRow
                      icon={<FileText className="h-5 w-5" />}
                      label="Tags"
                      value={
                        (account.tags && account.tags.length > 0) ? (
                          <div className="flex flex-wrap gap-1">
                            {account.tags.map((tag: string) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>) : '-'}
                    />
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Danger Zone */}
          <div className="w-full lg:hidden">
            {rbacCanAccess('accounts', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardContent>
                  <div className="mt-6 flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-2 space-y-1">
                      <p className="font-medium dark:text-white">
                        Delete Account
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Once you delete an account, there is no going back.
                        Please be certain.
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="destructive"
                              disabled={!rbacCanAccess('accounts', 'delete')}
                              onClick={() => setDeleteDialogOpen(true)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Account
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!rbacCanAccess('accounts', 'delete') && (
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

      <EditAccountDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        account={account}
      />

      <CreateContactDialog
        open={isContactDialogOpen}
        onOpenChange={setIsContactDialogOpen}
        defaultAccountId={id}
      />

      <OpportunityDialog
        isOpen={isOpportunityDialogOpen}
        onOpenChange={setIsOpportunityDialogOpen}
        defaultAccountId={id}
      />

      {workspace?.id && (
        <LogCallDialog
          open={isLogCallDialogOpen}
          onOpenChange={setIsLogCallDialogOpen}
          onSuccess={async () => {
            setIsLogCallDialogOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ['calls', workspace.id, 'account', id],
            });
          }}
          entityType="account"
          entityId={id}
          workspaceId={workspace.id}
          defaultContactName={account.account_name}
          defaultPhoneNumber={account.phone_number}
        />
      )}

      {canManageEmail && (
        <CoreEmailComposeDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          workspaceId={workspace?.id || ''}
          accounts={coreEmailAccounts}
          entityType="account"
          entityId={id}
          initialTo={accountEmailRecipients[0]?.email}
          templateContext={{
            account_name: account.account_name,
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

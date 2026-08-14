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
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailComposeDialog } from '@kit/core/pages';
import { getCoreEmailAccountsService } from '@kit/core/services';
import {
  convertFromUSD,
  findLatestRateToUsd,
  formatWorkspaceCurrency,
} from '@kit/shared/currency';
import type { ExchangeRateRecord } from '@kit/shared/currency';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
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
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import { DetailHeader } from '@kit/ui/detail-header';
import { DetailInfoList, DetailInfoRow } from '@kit/ui/detail-info-row';
import { InlineEditableValue } from '@kit/ui/inline-editable-value';
import { Input } from '@kit/ui/input';
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
import { ManageableStatusSelect } from '../../_components/manageable-status-select';
import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useLocalization } from '~/lib/localization/localization-provider';
import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  assignAccountToUser,
  getAccountAssignees,
} from '~/services/account-assignees.service';
import { getAccountByIdService, updateAccountService } from '~/services/accounts.service';
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
import { EntityTasks } from '../../_components/entity-tasks';
import { EntityActivityLogs } from '../../_components/entity-activity-logs';
import { AssignUserModal } from '../../leads/components/assign-user-modal';
import { LogCallDialog } from '../../leads/components/log-call-dialog';
import { OpportunityDialog } from '../../opportunities/components/opportunity-dialog';
import { AccountAssignees } from '../components/account-assignees';
import { EditAccountDialog } from '../components/edit-account-dialog';

function AccountDetailsSkeleton() {
  return (
    <ModuleGuard module="accounts">
      <div className="flex h-full flex-col">
        <div className="px-6 pb-2 pt-4">
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
  const [openAccordions, setOpenAccordions] = useState<string[]>(['details', 'additional', 'contacts']);
  const [isEditingAccountType, setIsEditingAccountType] = useState(false);
  const [isEditingRevenue, setIsEditingRevenue] = useState(false);

  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const canManageEmail = canAccess('emails', 'manage_email');
  const rbacCanAccess = canAccess;
  const { data: user } = useUser();

  const {
    data: account,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['account', id],
    queryFn: () => getAccountByIdService(id),
    enabled: !!id,
  });

  const accountUpdateMutation = useMutation({
    mutationFn: async (params: {
      field?: string;
      value?: any;
      fields?: Record<string, any>;
    }) => {
      if (!account) {
        throw new Error('Account is not available for updates');
      }

      const payload = {
        account_name: account.account_name,
        website: account.website,
        phone_number: account.phone_number,
        industry_id: account.industry_id,
        company_size: account.company_size,
        annual_revenue: account.annual_revenue,
        employee_count: account.employee_count,
        account_type: account.account_type,
        billing_street: account.billing_street,
        billing_city: account.billing_city,
        billing_state: account.billing_state,
        billing_postal_code: account.billing_postal_code,
        billing_country: account.billing_country,
        shipping_street: account.shipping_street,
        shipping_city: account.shipping_city,
        shipping_state: account.shipping_state,
        shipping_postal_code: account.shipping_postal_code,
        shipping_country: account.shipping_country,
        linkedin_url: account.linkedin_url,
        twitter_handle: account.twitter_handle,
        description: account.description,
        status_id: account.status_id,
        owner_id: account.owner_id,
        custom_fields: account.custom_fields,
      };

      if (params.fields) {
        Object.assign(payload, params.fields);
      } else if (params.field) {
        payload[params.field as keyof typeof payload] = params.value;
      }

      return updateAccountService(id, payload);
    },
    onSuccess: async () => {
      toast.success('Account updated successfully');
      await refetch();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update account';
      toast.error(message);
    },
  });

  const commitAccountField = async (
    field: string,
    value: any,
  ) => {
    await accountUpdateMutation.mutateAsync({
      field,
      value: typeof value === 'string' ? value.trim() || null : value,
    });
  };

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
    const accountCustom =
      (account.custom_fields as Record<string, unknown>) || {};
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

  const supabase = useSupabase();

  // Fetch workspace currencies for currency conversion
  const { data: currenciesData } = useQuery({
    queryKey: ['workspace-currencies', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const { data, error } = await supabase
        .schema('core')
        .from('workspace_currencies')
        .select('id, currency_code, is_default')
        .eq('workspace_id', workspace.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      if (error) {
        console.error('Failed to fetch workspace currencies:', error);
        return [];
      }
      return data;
    },
    enabled: !!workspace?.id,
  });

  // Fetch exchange rates for currency conversion
  const exchangeRates = workspace?.localization?.exchange_rates || [];

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

  const billingParts = [
    account.billing_street ?? '',
    account.billing_city ?? '',
    account.billing_state ?? '',
    account.billing_postal_code ?? '',
    account.billing_country ?? '',
  ];
  const billingAddress = billingParts.some(Boolean)
    ? billingParts.join(', ')
    : '';

  const shippingParts = [
    account.shipping_street ?? '',
    account.shipping_city ?? '',
    account.shipping_state ?? '',
    account.shipping_postal_code ?? '',
    account.shipping_country ?? '',
  ];
  const shippingAddress = shippingParts.some(Boolean)
    ? shippingParts.join(', ')
    : '';

  return (
    <ModuleGuard module="accounts">
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className="w-6 h-6 border-leadgaze-border border p-0"
          >
            <Link href="/home/sales/accounts">
              <ArrowLeft className="h-3 w-3" />
            </Link>
          </Button>
          <h1 className="primary-heading-extra text-leadgaze-dark dark:text-white">
            Account Details
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setIsLogCallDialogOpen(true)}
                    className="secondary-text-small-bold text-leadgaze-dark dark:text-white gap-1.5 px-2"
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
                    className={`secondary-text-small-bold text-leadgaze-dark dark:text-white gap-1.5 px-2 ${accountEmailRecipients.length === 0 ? 'opacity-50' : ''}`}                    
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
              onClick={() => setIsEditDialogOpen(true)}
              className="secondary-text-small-bold bg-leadgaze-primary hover:bg-leadgaze-primary text-white gap-1.5 px-2"
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
        <div className="flex w-full flex-col gap-2 lg:min-h-0 lg:flex-1 lg:flex-row">
          {/* Main Content */}
          <div className="w-full space-y-4 lg:w-[65%] lg:overflow-y-auto">
            <DetailHeader
              avatar={
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-leadgaze-primary text-base font-semibold text-white">
                  <Building2 className="text-white h-6 w-6" />
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
                      Created by {account.created_by_account?.name || 'Unknown'}{' '}
                      on {formatDate(account.created_at)}
                    </span>
                  </div>
                  {account.updated_by && (
                    <>
                      <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          Updated by{' '}
                          {account.updated_by_account?.name || 'Unknown'} on{' '}
                          {formatDate(account.updated_at)}
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
              className="space-y-4 mb-2"
            >
              <TabsList className="mb-0 h-auto w-full justify-start gap-3 overflow-x-auto rounded-none border-b bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden">
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

              <TabsContent
                value="tasks"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityTasks entityType="account" entityId={id} />
              </TabsContent>

              <TabsContent value="activity">
                <EntityActivityLogs entityType="account" entityId={id} />
              </TabsContent>
            </Tabs>

            {/* Danger Zone */}
            {rbacCanAccess('accounts', 'delete') && (
              <Card className="border-destructive/50 hidden border-solid lg:block">
                <CardContent className="p-2">
                  <div className="flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-0 space-y-1">
                      <p className="primary-text-medium dark:text-white">
                        Delete Account
                      </p>
                      <p className="text-muted-foreground secondary-text-small">
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
                              className="secondary-text-small-bold"
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
              type="multiple"
              className="space-y-2"
              value={openAccordions}
              onValueChange={setOpenAccordions}
            >
              {/* Account Details */}
              <AccordionItem
                value="details"
                className="overflow-hidden border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-3">
                  <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">

                    <Building2 className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    Account Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-2">
                  <DetailInfoList>
                    {canView('phone') && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Phone
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={account.phone_number || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitAccountField('phone_number', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('employee_count') && (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Users className="text-muted-foreground h-5 w-5 shrink-0" />
                            <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                              Employees
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 text-right">
                            <InlineEditableValue
                              value={account.employee_count ? String(account.employee_count) : ''}
                              disabled={!canEdit}
                              placeholder="-"
                              type="number"
                              className="justify-end"
                              displayClassName="primary-text-regular text-leadgaze-dark dark:text-white"
                              inputClassName="text-right"
                              onCommit={async (nextValue) => {
                                const val = nextValue.trim() ? parseInt(nextValue) : null;
                                await commitAccountField('employee_count', val);
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Users className="text-muted-foreground h-5 w-5 shrink-0" />
                            <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                              Company Size
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 text-right">
                            <InlineEditableValue
                              value={account.company_size || ''}
                              disabled={!canEdit}
                              placeholder="-"
                              className="justify-end"
                              displayClassName="primary-text-regular text-leadgaze-dark dark:text-white"
                              inputClassName="text-right"
                              onCommit={async (nextValue) => {
                                await commitAccountField('company_size', nextValue);
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {canView('annual_revenue') && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Revenue
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          {isEditingRevenue ? (
                            <Input
                              type="number"
                              className="ml-auto w-[220px] text-right animate-in fade-in duration-200"
                              defaultValue={account.annual_revenue || ''}
                              disabled={!canEdit}
                              onBlur={async (e) => {
                                const val = e.target.value.trim() ? parseFloat(e.target.value) : null;
                                await commitAccountField('annual_revenue', val);
                                setIsEditingRevenue(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setIsEditingRevenue(false);
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setIsEditingRevenue(true)}
                              className={cn(
                                'group inline-flex w-full items-center justify-end rounded-[4px] text-right outline-none transition-colors h-[34px]',
                                {
                                  'cursor-text': canEdit,
                                  'hover:bg-accent/20': canEdit,
                                },
                              )}
                            >
                              <span className="block w-full rounded-[4px] px-0 py-0 text-right text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                                {(() => {
                                  const workspaceCurrency =
                                    currenciesData?.find((c) => c.is_default)
                                      ?.currency_code || 'USD';
                                  return formatWorkspaceCurrency(
                                    account.annual_revenue || 0,
                                    workspaceCurrency,
                                  );
                                })()}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {canView('account_type') && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Tag className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Type
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          {isEditingAccountType ? (
                            <div className="ml-auto w-[220px]">
                              <ManageableStatusSelect
                                moduleKey="accounts"
                                workspaceId={workspace?.id ?? ''}
                                value={account.account_type ?? ''}
                                onValueChange={async (value) => {
                                  await commitAccountField('account_type', value || null);
                                  setIsEditingAccountType(false);
                                }}
                                open={isEditingAccountType}
                                onOpenChange={(open) => {
                                  if (!open) setIsEditingAccountType(false);
                                }}
                                disabled={!canEdit}
                                triggerClassName="text-right justify-end"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setIsEditingAccountType(true)}
                              className={cn(
                                'group inline-flex w-full items-center justify-end rounded-[4px] text-right outline-none transition-colors h-[34px]',
                                {
                                  'cursor-text': canEdit,
                                  'text-muted-foreground': !account.account_type,
                                  'hover:bg-accent/20': canEdit,
                                },
                              )}
                            >
                              <span className="block w-full rounded-[4px] px-0 py-0 text-right text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                                {account.account_type ? (
                                  <span className="capitalize">
                                    {account.account_type_relation?.status_name || account.account_type}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {canView('linkedin') && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Linkedin className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            LinkedIn
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={account.linkedin_url || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitAccountField('linkedin_url', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('description') && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Description
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={account.description || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="primary-text-regular text-leadgaze-dark dark:text-white"
                            inputClassName="text-right"
                            multiline
                            onCommit={async (nextValue) => {
                              await commitAccountField('description', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('billing_street') && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Billing
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={billingAddress || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="primary-text-regular text-leadgaze-dark dark:text-white"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              const parts = nextValue.split(',').map((p) => p.trim());
                              const fields = {
                                billing_street: parts[0] || null,
                                billing_city: parts[1] || null,
                                billing_state: parts[2] || null,
                                billing_postal_code: parts[3] || null,
                                billing_country: parts[4] || null,
                              };
                              await accountUpdateMutation.mutateAsync({ fields });
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('shipping_street') && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Shipping
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={shippingAddress || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="primary-text-regular text-leadgaze-dark dark:text-white"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              const parts = nextValue.split(',').map((p) => p.trim());
                              const fields = {
                                shipping_street: parts[0] || null,
                                shipping_city: parts[1] || null,
                                shipping_state: parts[2] || null,
                                shipping_postal_code: parts[3] || null,
                                shipping_country: parts[4] || null,
                              };
                              await accountUpdateMutation.mutateAsync({ fields });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>

              {/* Additional Data (Custom Fields) */}
              {customFieldsToShow.length > 0 && (
                <AccordionItem
                  value="additional"
                  className="overflow-hidden border bg-white dark:bg-zinc-900"
                >
                  <AccordionTrigger className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-3">
                    <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">
                      <FileText className="text-leadgaze-dark h-4 w-4 dark:text-white" />
                      Additional Data
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-2">
                    <DetailInfoList>
                      {customFieldsToShow.map((field) => {
                        const val = (
                          account.custom_fields as Record<string, unknown>
                        )?.[field.field_key];
                        return (
                          <DetailInfoRow
                            key={field.id}
                            label={field.field_label}
                            value={
                              val === true
                                ? 'Yes'
                                : val === false
                                  ? 'No'
                                  : String(val ?? '-')
                            }
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
                className="overflow-hidden border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger
                  hideChevron
                  className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-2"
                >
                  <div className="flex w-full justify-between items-center">
                    <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">
                      <Users className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                      Contacts
                    </span>
                    {rbacCanAccess('accounts', 'add_contact') && (
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsContactDialogOpen(true);
                        }}
                        className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2 disabled:pointer-events-none disabled:opacity-50 mr-2"                        
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Contact</span>
                      </Button>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400',
                      openAccordions.includes('contacts') && 'rotate-180'
                    )}
                  />
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-2">
                  {rbacCanAccess('accounts', 'view_contacts') ? (
                    contacts && contacts.length > 0 ? (
                      <CardWidgetList>
                        {contacts.map((contact: any) => (
                          <CardWidgetListItem
                            key={contact.id}
                            iconAlignTop={true}
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
              {rbacCanAccess('accounts', 'view_opportunities') &&
                (rbacCanAccess('opportunities', 'view') ||
                  rbacCanAccess('opportunities', 'read')) && (
                  <AccordionItem
                    value="opportunities"
                    className="overflow-hidden border bg-white dark:bg-zinc-900"
                  >
                    <AccordionTrigger
                      hideChevron
                      className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-2"
                    >
                      <div className="flex w-full justify-between items-center">
                        <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">
                          <Briefcase className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                          Opportunities
                        </span>
                        <Button
                          type="button"
                          disabled={!rbacCanAccess('opportunities', 'create')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOpportunityDialogOpen(true);
                          }}
                          className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2 disabled:pointer-events-none disabled:opacity-50 mr-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>New Opportunity</span>
                        </Button>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400',
                          openAccordions.includes('opportunities') && 'rotate-180'
                        )}
                      />
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-2">
                      {opportunities && opportunities.length > 0 ? (
                        <CardWidgetList>
                          {opportunities.map((opp: any) => (
                            <CardWidgetListItem
                              key={opp.id}
                              actionStyle="slide"
                              title={opp.opportunity_name}
                              badge={
                                opp.stage && (
                                  <Badge
                                    variant="outline"
                                    className="h-5 text-[10px] font-medium"
                                    style={{
                                      borderColor: opp.stage.color ? `${opp.stage.color}60` : undefined,
                                      color: opp.stage.color || undefined,
                                      backgroundColor: opp.stage.color ? `${opp.stage.color}15` : undefined,
                                    }}
                                  >
                                    {opp.stage.status_name}
                                  </Badge>
                                )
                              }
                              subtitle={
                                <span>
                                  {(() => {
                                    const workspaceCurrency =
                                      currenciesData?.find((c) => c.is_default)
                                        ?.currency_code || 'USD';

                                    // If opportunity has base_amount_usd, use that with workspace currency
                                    if (
                                      opp.base_amount_usd !== null &&
                                      opp.base_amount_usd !== undefined
                                    ) {
                                      const rate =
                                        findLatestRateToUsd(
                                          exchangeRates as ExchangeRateRecord[],
                                          workspaceCurrency,
                                        )?.exchange_rate || 1;
                                      const convertedAmount = convertFromUSD(
                                        opp.base_amount_usd,
                                        rate,
                                      );
                                      return formatWorkspaceCurrency(
                                        convertedAmount,
                                        workspaceCurrency,
                                      );
                                    }

                                    // Fallback: use original amount with original currency
                                    if (
                                      opp.amount_original !== null &&
                                      opp.amount_original !== undefined
                                    ) {
                                      const currency =
                                        opp.currency_original ||
                                        opp.currency ||
                                        'USD';
                                      return formatWorkspaceCurrency(
                                        opp.amount_original,
                                        currency,
                                      );
                                    }

                                    // Last resort: use stored amount
                                    return formatWorkspaceCurrency(
                                      opp.amount || 0,
                                      opp.currency || 'USD',
                                    );
                                  })()}
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
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )}

              {/* Assigned Team Members */}
              {workspace?.id && (
                <AccordionItem
                  value="assignees"
                  className="overflow-hidden border bg-white dark:bg-zinc-900"
                >
                  <AccordionTrigger
                    hideChevron
                    className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-2"
                  >
                    <div className="flex w-full justify-between items-center">
                      <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">
                        <Users className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                        Assigned Members
                      </span>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAssignModalOpen(true);
                        }}
                        className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2 mr-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Assign Member</span>
                      </Button>
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400',
                        openAccordions.includes('assignees') && 'rotate-180'
                      )}
                    />
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-2">
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
                className="overflow-hidden border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-3">
                  <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">

                    <Clock className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    System Info
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-2">
                  <DetailInfoList>
                    <DetailInfoRow
                      icon={<User className="h-5 w-5" />}
                      label="Owner"
                      value={account.owner?.name || '-'}
                    />
                    <DetailInfoRow
                      icon={<Calendar className="h-5 w-5" />}
                      label="Created At"
                      value={
                        account.created_at
                          ? formatDate(account.created_at)
                          : '-'
                      }
                    />
                    <DetailInfoRow
                      icon={<Calendar className="h-5 w-5" />}
                      label="Updated"
                      value={
                        account.updated_at
                          ? formatDate(account.updated_at)
                          : '-'
                      }
                    />

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Globe className="text-muted-foreground h-5 w-5 shrink-0" />
                        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                          Twitter
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <InlineEditableValue
                          value={account.twitter_handle || ''}
                          disabled={!canEdit}
                          placeholder="-"
                          className="justify-end"
                          displayClassName="truncate text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          inputClassName="text-right"
                          onCommit={async (nextValue) => {
                            await commitAccountField('twitter_handle', nextValue || null);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="text-muted-foreground h-5 w-5 shrink-0" />
                        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                          Tags
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <InlineEditableValue
                          value={account.tags && account.tags.length > 0 ? account.tags.join(', ') : ''}
                          disabled={!canEdit}
                          placeholder="-"
                          className="justify-end"
                          displayClassName="primary-text-regular text-leadgaze-dark dark:text-white"
                          inputClassName="text-right"
                          renderDisplay={(val) =>
                            val ? (
                              <div className="flex flex-wrap justify-end gap-1">
                                {val.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-[10px]">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-900 dark:text-white">-</span>
                            )
                          }
                          onCommit={async (nextValue) => {
                            const tags = nextValue
                              ? nextValue.split(',').map((t) => t.trim()).filter(Boolean)
                              : [];
                            await commitAccountField('tags', tags.length > 0 ? tags : null);
                          }}
                        />
                      </div>
                    </div>
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Danger Zone */}
          <div className="w-full lg:hidden">
            {rbacCanAccess('accounts', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardContent className="p-2">
                  <div className="flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-0 space-y-1">
                      <p className="primary-text-medium dark:text-white">
                        Delete Account
                      </p>
                      <p className="text-muted-foreground secondary-text-small">
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
                              className="secondary-text-small-bold"
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

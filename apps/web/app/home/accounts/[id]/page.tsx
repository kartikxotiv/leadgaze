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
  DollarSign,
  Edit2,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
} from 'lucide-react';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import { CustomInputForView } from '@kit/ui/custom-input-for-view';
import { DetailHeader } from '@kit/ui/detail-header';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import { CreateContactDialog } from '~/home/contacts/components/create-contact-dialog';
import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountByIdService } from '~/services/accounts.service';
import { type Contact, getContactsService } from '~/services/contacts.service';
import { getWorkspaceEmailAccountService } from '~/services/email.service';
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
import { EmailLeadDialog } from '../../leads/components/email-lead-dialog';
import { LogCallDialog } from '../../leads/components/log-call-dialog';
import { OpportunityDialog } from '../../opportunities/components/opportunity-dialog';
import { AccountAssignees } from '../components/account-assignees';
import { EditAccountDialog } from '../components/edit-account-dialog';

function AccountDetailsSkeleton() {
  return (
    <ModuleGuard module="accounts">
      <div className="px-6 pt-4 pb-2">
        <div className="mb-2">
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
      <PageBody className="pb-6">
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
              <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(2)].map((_, i) => (
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

export default function AccountDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isOpportunityDialogOpen, setIsOpportunityDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const { currentWorkspace: workspace } = useRBAC();
  const {
    data: account,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['account', id],
    queryFn: () => getAccountByIdService(id),
    enabled: !!id,
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

  const { data: user } = useUser();
  const editPermission = usePermissionDetail('accounts', 'edit');
  const canEdit = useCanAccessData(editPermission, account?.owner_id, user?.id);
  const { canAccess: rbacCanAccess } = useRBAC();

  const { data: opportunitiesData } = useQuery({
    queryKey: ['opportunities', 'account', id],
    queryFn: () => getOpportunitiesService({ workspaceId, accountId: id }),
    enabled: !!workspaceId && !!id,
  });

  const opportunities = opportunitiesData?.data || [];

  const { data: workspaceEmailAccounts = [] } = useQuery({
    queryKey: ['workspace-email-accounts', workspace?.id],
    queryFn: () => getWorkspaceEmailAccountService(workspace?.id || ''),
    enabled: !!workspace?.id,
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
            The account you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Button asChild variant="outline">
            <Link href="/home/accounts">Back to Accounts</Link>
          </Button>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="accounts">
      <div className="px-6 pt-4 pb-2 flex justify-between items-center w-full">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="border p-0 border-leadgaze-border">
            <Link href="/home/accounts">
              <ArrowLeft className="ml-2 mr-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">Account details</h1>
            <p className="text-leadgaze-muted text-sm">View and edit lead information</p>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Account
          </Button>
        )}
      </div>

      <PageBody className="pb-6">
        <DeleteEntityDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityId={id}
          entityType="account"
          entityName={account.account_name}
          onSuccess={() => router.push('/home/accounts')}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
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
                      Created on{' '}
                      {new Date(account.created_at).toLocaleDateString(
                        undefined,
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )}
                    </span>
                  </div>
                </>
              }
              actions={
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
                      accountEmailRecipients.length === 0 ? 'opacity-50' : ''
                    }`}
                    disabled={accountEmailRecipients.length === 0}
                    onClick={() => setIsEmailDialogOpen(true)}
                    title={
                      accountEmailRecipients.length === 0
                        ? 'Account has no contact email addresses'
                        : 'Send email to account contact'
                    }
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400">
                      <Mail className="h-3.5 w-3.5 text-white" />
                    </div>
                  </Button>
                </div>
              }
            />
            <CardWidgetContainer
              title="Details"
              icon={
                <Building2 className="text-leadgaze-dark h-5 w-5 dark:text-white" />
              }
            >
              <div className="flex-1">
                <div className="grid grid-cols-1 gap-4 px-6 py-3 md:grid-cols-2">
                  {account.phone_number && (
                    <CustomInputForView
                      label="Phone"
                      labelIcon={
                        <Phone className="text-muted-foreground h-4 w-4" />
                      }
                      value={
                        <a
                          href={`tel:${account.phone_number}`}
                          className="block text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {account.phone_number}
                        </a>
                      }
                    />
                  )}

                  {(account.company_size || account.employee_count) && (
                    <CustomInputForView
                      label="Employees"
                      labelIcon={
                        <Users className="text-muted-foreground h-4 w-4" />
                      }
                      value={account.company_size || account.employee_count}
                    />
                  )}

                  {account.annual_revenue && (
                    <CustomInputForView
                      label="Annual Revenue"
                      labelIcon={
                        <DollarSign className="text-muted-foreground h-4 w-4" />
                      }
                      value={new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(account.annual_revenue)}
                    />
                  )}

                  {account.account_type && (
                    <CustomInputForView
                      label="Type"
                      value={account.account_type}
                      className="capitalize"
                    />
                  )}

                  {account.linkedin_url && (
                    <CustomInputForView
                      label="LinkedIn"
                      labelIcon={
                        <Linkedin className="text-muted-foreground h-4 w-4" />
                      }
                      value={
                        <a
                          href={account.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {account.linkedin_url}
                        </a>
                      }
                    />
                  )}

                  {account.description && (
                    <CustomInputForView
                      label="Description"
                      value={account.description}
                      as="textarea"
                      className="col-span-2"
                    />
                  )}

                  {(account.billing_street ||
                    account.billing_city ||
                    account.billing_state ||
                    account.billing_postal_code ||
                    account.billing_country) && (
                    <CustomInputForView
                      label="Billing Address"
                      labelIcon={
                        <MapPin className="text-muted-foreground h-4 w-4" />
                      }
                      value={[
                        account.billing_street,
                        account.billing_city,
                        account.billing_state,
                        account.billing_postal_code,
                        account.billing_country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      className="col-span-2"
                    />
                  )}

                  {(account.shipping_street ||
                    account.shipping_city ||
                    account.shipping_state ||
                    account.shipping_postal_code ||
                    account.shipping_country) && (
                    <CustomInputForView
                      label="Shipping Address"
                      labelIcon={
                        <MapPin className="text-muted-foreground h-4 w-4" />
                      }
                      value={[
                        account.shipping_street,
                        account.shipping_city,
                        account.shipping_state,
                        account.shipping_postal_code,
                        account.shipping_country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      className="col-span-2"
                    />
                  )}
                </div>
              </div>
            </CardWidgetContainer>

            {/* Contacts Section */}
            <CardWidgetContainer
              title="Contacts"
              icon={
                <Users className="text-leadgaze-dark h-5 w-5 dark:text-white" />
              }
              icon2={
                rbacCanAccess('accounts', 'add_contact') && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setIsContactDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                )
              }
            >
              <div className="px-6 py-4">
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
                              {contact.job_title && contact.department && ' • '}
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
                                <Link href={`/home/contacts/${contact.id}`}>
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
              </div>
            </CardWidgetContainer>

            {/* Opportunities Section */}
            <CardWidgetContainer
              title="Opportunities"
              icon={
                <Briefcase className="text-leadgaze-dark h-5 w-5 dark:text-white" />
              }
              icon2={
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setIsOpportunityDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Opportunity
                </Button>
              }
            >
              <div className="px-6 py-4">
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
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: opp.currency || 'USD',
                              }).format(opp.amount)}
                            </span>
                          }
                          metadata={
                            <span>
                              {opp.expected_close_date && `Expected Close: ${new Date(opp.expected_close_date).toLocaleDateString()}`}
                              {opp.expected_close_date && opp.probability !== undefined && ' • '}
                              {opp.probability !== undefined && `Probability: ${opp.probability}%`}
                            </span>
                          }
                          actions={
                            rbacCanAccess('opportunities', 'view') && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/home/opportunities/${opp.id}`}>
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
              </div>
            </CardWidgetContainer>
            {/* Notes Section */}
            <EntityNotes entityType="account" entityId={id} />
 
            {/* Danger Zone */}
            {rbacCanAccess('accounts', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardHeader>
                  <CardTitle className="text-destructive text-lg"></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Delete Account</p>
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
                      {account.owner?.name || '-'}
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
                      {new Date(account.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Last Updated
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">
                      {new Date(account.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
 
                {account.twitter_handle && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-medium">
                        Twitter
                      </p>
                      <a
                        href={`https://twitter.com/${account.twitter_handle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline"
                      >
                        @{account.twitter_handle.replace('@', '')}
                      </a>
                    </div>
                  </>
                )}
                {account.tags && account.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium">
                        Tags
                      </p>
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
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
 
            {/* Account Assignees Section */}
            {workspace?.id && (
              <AccountAssignees accountId={id} workspaceId={workspace.id} />
            )}
 
            {/* Activity Sections */}
            <EntityCalls entityType="account" entityId={id} />
            <EntityEmails
              entityId={id}
              entityType="account"
              entityName={account.account_name}
              recipientOptions={accountEmailRecipients}
            />
            <EntityReminders entityType="account" entityId={id} />
            <EntityMeetings entityType="account" entityId={id} />
            <EntityDocuments entityType="account" entityId={id} />
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

      <EmailLeadDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        leadName={account.account_name}
        recipientOptions={accountEmailRecipients}
        workspaceEmailAccounts={workspaceEmailAccounts}
        entityId={id}
        entityType="account"
      />
    </ModuleGuard>
  );
}

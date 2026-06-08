'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
  Users,
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
import { OpportunityDialog } from '../../../opportunities/components/opportunity-dialog';
import { AccountAssignees } from '../components/account-assignees';
import { EditAccountDialog } from '../components/edit-account-dialog';

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
    return (
      <ModuleGuard module="accounts">
        <div className="flex h-screen items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
        </div>
      </ModuleGuard>
    );
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
      <div className="bg-background border-b px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/home/accounts">
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

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
              >
                Edit Account
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg">
              <Building2 className="text-primary h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{account.account_name}</h1>
              <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
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
                    className="hover:text-primary flex items-center gap-1 hover:underline"
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
          entityType="account"
          entityName={account.account_name}
          onSuccess={() => router.push('/home/accounts')}
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
                    Phone
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone className="text-muted-foreground h-4 w-4" />
                    <a
                      href={`tel:${account.phone_number}`}
                      className="text-sm hover:underline"
                    >
                      {account.phone_number || '-'}
                    </a>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Employees
                  </p>
                  <div className="flex items-center gap-2">
                    <Users className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm">
                      {account.company_size || account.employee_count || '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Annual Revenue
                  </p>
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm">
                      {account.annual_revenue
                        ? new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(account.annual_revenue)
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Type
                  </p>
                  <span className="text-sm capitalize">
                    {account.account_type || '-'}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    LinkedIn
                  </p>
                  <div className="flex items-center gap-2">
                    <Linkedin className="text-muted-foreground h-4 w-4" />
                    {account.linkedin_url ? (
                      <a
                        href={account.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm break-all hover:underline"
                      >
                        {account.linkedin_url}
                      </a>
                    ) : (
                      <span className="text-sm">-</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <p className="text-muted-foreground text-sm font-medium">
                    Description
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {account.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <p className="text-muted-foreground text-sm font-medium">
                    Billing Address
                  </p>
                  <div className="flex items-start gap-2">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                    <div className="text-sm">
                      {[
                        account.billing_street,
                        account.billing_city,
                        account.billing_state,
                        account.billing_postal_code,
                        account.billing_country,
                      ]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <p className="text-muted-foreground text-sm font-medium">
                    Shipping Address
                  </p>
                  <div className="flex items-start gap-2">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                    <div className="text-sm">
                      {[
                        account.shipping_street,
                        account.shipping_city,
                        account.shipping_state,
                        account.shipping_postal_code,
                        account.shipping_country,
                      ]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold">Contacts</CardTitle>
                {rbacCanAccess('accounts', 'add_contact') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsContactDialogOpen(true)}
                  >
                    Add Contact
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {rbacCanAccess('accounts', 'view_contacts') ? (
                  contacts && contacts.length > 0 ? (
                    <div className="divide-y">
                      {contacts.map((contact: any) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
                              {contact.first_name[0]}
                              {contact.last_name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {contact.first_name} {contact.last_name}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {contact.job_title}{' '}
                                {contact.department
                                  ? `(${contact.department})`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-muted-foreground hidden text-right text-xs sm:block">
                              <p>{contact.email}</p>
                              <p>{contact.phone_number}</p>
                            </div>
                            {rbacCanAccess('contacts', 'view') && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/home/contacts/${contact.id}`}>
                                  View
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
              </CardContent>
            </Card>

            {/* Opportunities Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold">
                  Opportunities
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsOpportunityDialogOpen(true)}
                >
                  New Opportunity
                </Button>
              </CardHeader>
              <CardContent>
                {rbacCanAccess('accounts', 'view_opportunities') ? (
                  opportunities && opportunities.length > 0 ? (
                    <div className="divide-y">
                      {opportunities.map((opp: any) => (
                        <div
                          key={opp.id}
                          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {opp.opportunity_name}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              {opp.stage && (
                                <Badge
                                  variant="outline"
                                  className="h-4 text-[10px]"
                                >
                                  {opp.stage.status_name}
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: opp.currency || 'USD',
                                }).format(opp.amount)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-muted-foreground hidden text-right text-xs sm:block">
                              <p>
                                Expected Close:{' '}
                                {opp.expected_close_date
                                  ? new Date(
                                      opp.expected_close_date,
                                    ).toLocaleDateString()
                                  : '-'}
                              </p>
                              <p>Probability: {opp.probability}%</p>
                            </div>
                            {rbacCanAccess('opportunities', 'view') && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/home/opportunities/${opp.id}`}>
                                  View
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
              </CardContent>
            </Card>

            {/* Account Assignees Section */}
            {workspace?.id && (
              <AccountAssignees accountId={id} workspaceId={workspace.id} />
            )}

            {/* Notes Section */}
            <EntityNotes entityType="account" entityId={id} />

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

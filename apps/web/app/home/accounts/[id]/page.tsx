'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  Globe,
  Mail,
  MapPin,
  Phone,
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
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountByIdService } from '~/services/accounts.service';
import { getContactsService } from '~/services/contacts.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityNotes } from '../../_components/entity-notes';
import { PublicPrivateToggle } from '../../_components/public-private-toggle';
import { CreateContactDialog } from '../../contacts/components/create-contact-dialog';
import { OpportunityDialog } from '../../opportunities/components/opportunity-dialog';
import { AccountAssignees } from '../components/account-assignees';
import { EditAccountDialog } from '../components/edit-account-dialog';

export default function AccountDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isOpportunityDialogOpen, setIsOpportunityDialogOpen] = useState(false);
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
    queryFn: () => getContactsService({ workspaceId, accountId: id }),
    enabled: !!workspaceId && !!id,
  });

  const contacts = contactsData?.data || [];

  const { data: user } = useUser();
  const editPermission = usePermissionDetail('accounts', 'edit');
  const canEdit = useCanAccessData(editPermission, account?.owner_id, user?.id);

  const { data: opportunitiesData } = useQuery({
    queryKey: ['opportunities', 'account', id],
    queryFn: () => getOpportunitiesService({ workspaceId, accountId: id }),
    enabled: !!workspaceId && !!id,
  });

  const opportunities = opportunitiesData?.data || [];

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            disabled={!canEdit}
            title={
              !canEdit ? 'You do not have permission to edit this account' : ''
            }
          >
            Edit Account
          </Button>
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsContactDialogOpen(true)}
                >
                  Add Contact
                </Button>
              </CardHeader>
              <CardContent>
                {contacts && contacts.length > 0 ? (
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
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/home/contacts/${contact.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-6 text-center text-sm">
                    No contacts associated with this account.
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
                  Add Opportunity
                </Button>
              </CardHeader>
              <CardContent>
                {opportunities && opportunities.length > 0 ? (
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
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/home/opportunities/${opp.id}`}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-6 text-center text-sm">
                    No opportunities associated with this account.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Assignees Section */}
            {workspace?.id && (
              <AccountAssignees accountId={id} workspaceId={workspace.id} />
            )}

            {/* Public/Private Toggle */}
            {workspace?.id && account && (
              <PublicPrivateToggle
                entityType="account"
                entityId={id}
                isPublic={account.is_public ?? true}
                createdBy={account.created_by}
                workspaceId={workspace.id}
              />
            )}

            {/* Notes Section */}
            <EntityNotes entityType="account" entityId={id} />

            {/* Activity Sections */}
            <EntityReminders entityType="account" entityId={id} />
            <EntityMeetings entityType="account" entityId={id} />
            <EntityDocuments entityType="account" entityId={id} />
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
                {account.linkedin_url && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs font-medium">
                        LinkedIn
                      </p>
                      <a
                        href={account.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm break-all text-blue-600 hover:underline"
                      >
                        {account.linkedin_url}
                      </a>
                    </div>
                  </>
                )}
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
    </ModuleGuard>
  );
}

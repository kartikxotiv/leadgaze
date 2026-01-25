'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Globe, Phone, MapPin, Mail, Calendar, User, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';

import { getAccountByIdService } from '~/services/accounts.service';
import { getContactsService } from '~/services/contacts.service';
import { getOpportunitiesService } from '~/services/opportunities.service';
import { EntityNotes } from '../../_components/entity-notes';
import { EntityDocuments, EntityMeetings, EntityReminders } from '../../_components/entity-activity';
import { EditAccountDialog } from '../components/edit-account-dialog';

export default function AccountDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

    const { data: contacts } = useQuery({
        queryKey: ['contacts', 'account', id],
        queryFn: () => getContactsService(workspaceId, id),
        enabled: !!workspaceId && !!id,
    });

    const { data: opportunities } = useQuery({
        queryKey: ['opportunities', 'account', id],
        queryFn: () => getOpportunitiesService(workspaceId, id),
        enabled: !!workspaceId && !!id,
    });

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error || !account) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Account Not Found</h1>
                <p className="text-muted-foreground">
                    The account you're looking for doesn't exist or you don't have permission to view it.
                </p>
                <Button asChild variant="outline">
                    <Link href="/home/accounts">Back to Accounts</Link>
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="border-b bg-background px-6 py-4">
                <div className="mb-4 flex items-center justify-between">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href="/home/accounts">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                        Edit Account
                    </Button>
                </div>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{account.account_name}</h1>
                            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
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
                                        className="flex items-center gap-1 hover:text-primary hover:underline"
                                    >
                                        <Globe className="h-3 w-3" />
                                        {account.website.replace(/^https?:\/\//, '')}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {account.status && (
                            <Badge
                                variant="secondary"
                                style={{
                                    backgroundColor: `${account.status.color}20`,
                                    color: account.status.color,
                                    borderColor: account.status.color,
                                }}
                            >
                                {account.status.status_name}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <PageBody>
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a href={`tel:${account.phone_number}`} className="text-sm hover:underline">{account.phone_number || '-'}</a>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Employees</p>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{account.company_size || account.employee_count || '-'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Annual Revenue</p>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            {account.annual_revenue
                                                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(account.annual_revenue)
                                                : '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                                    <span className="text-sm capitalize">{account.account_type || '-'}</span>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                                    <p className="text-sm whitespace-pre-wrap">{account.description || 'No description provided.'}</p>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Billing Address</p>
                                    <div className="flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <div className="text-sm">
                                            {[
                                                account.billing_street,
                                                account.billing_city,
                                                account.billing_state,
                                                account.billing_postal_code,
                                                account.billing_country
                                            ].filter(Boolean).join(', ') || '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Shipping Address</p>
                                    <div className="flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <div className="text-sm">
                                            {[
                                                account.shipping_street,
                                                account.shipping_city,
                                                account.shipping_state,
                                                account.shipping_postal_code,
                                                account.shipping_country
                                            ].filter(Boolean).join(', ') || '-'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contacts Section */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-bold">Contacts</CardTitle>
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/home/contacts/new?accountId=${id}`}>Add Contact</Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {contacts && contacts.length > 0 ? (
                                    <div className="divide-y">
                                        {contacts.map((contact: any) => (
                                            <div key={contact.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                        {contact.first_name[0]}{contact.last_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{contact.first_name} {contact.last_name}</p>
                                                        <p className="text-xs text-muted-foreground">{contact.job_title} {contact.department ? `(${contact.department})` : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                                                        <p>{contact.email}</p>
                                                        <p>{contact.phone_number}</p>
                                                    </div>
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <Link href={`/home/contacts/${contact.id}`}>View</Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        No contacts associated with this account.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Opportunities Section */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-bold">Opportunities</CardTitle>
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/home/opportunities/new?accountId=${id}`}>Add Opportunity</Link>
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {opportunities && opportunities.length > 0 ? (
                                    <div className="divide-y">
                                        {opportunities.map((opp: any) => (
                                            <div key={opp.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                                <div>
                                                    <p className="text-sm font-medium">{opp.opportunity_name}</p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        {opp.stage && (
                                                            <Badge variant="outline" className="text-[10px] h-4">
                                                                {opp.stage.status_name}
                                                            </Badge>
                                                        )}
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: opp.currency || 'USD' }).format(opp.amount)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                                                        <p>Expected Close: {opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString() : '-'}</p>
                                                        <p>Probability: {opp.probability}%</p>
                                                    </div>
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <Link href={`/home/opportunities/${opp.id}`}>View</Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        No opportunities associated with this account.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Notes Section */}
                        <EntityNotes
                            entityType="account"
                            entityId={id}
                        />

                        {/* Activity Sections */}
                        <EntityReminders entityType="account" entityId={id} />
                        <EntityMeetings entityType="account" entityId={id} />
                        <EntityDocuments entityType="account" entityId={id} />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">System Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Owner</p>
                                    <div className="flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        <span className="text-sm">{account.owner?.name || '-'}</span>
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Created At</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span className="text-sm">{new Date(account.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span className="text-sm">{new Date(account.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {account.linkedin_url && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">LinkedIn</p>
                                            <a href={account.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                                                {account.linkedin_url}
                                            </a>
                                        </div>
                                    </>
                                )}
                                {account.twitter_handle && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">Twitter</p>
                                            <a href={`https://twitter.com/${account.twitter_handle.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                                                @{account.twitter_handle.replace('@', '')}
                                            </a>
                                        </div>
                                    </>
                                )}
                                {(account.tags && account.tags.length > 0) && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-muted-foreground">Tags</p>
                                            <div className="flex flex-wrap gap-1">
                                                {account.tags.map((tag: string) => (
                                                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
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
        </>
    );
}

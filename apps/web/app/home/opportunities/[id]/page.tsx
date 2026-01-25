'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, User, Calendar, FileText, CheckCircle, Wallet, Target, Flag, Tag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';

import { getOpportunityByIdService } from '~/services/opportunities.service';
import { EntityNotes } from '../../_components/entity-notes';
import { EntityDocuments, EntityMeetings, EntityReminders } from '../../_components/entity-activity';

export default function OpportunityDetailsPage() {
    const params = useParams();
    const id = params?.id as string;

    const {
        data: opportunity,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['opportunity', id],
        queryFn: () => getOpportunityByIdService(id),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error || !opportunity) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Opportunity Not Found</h1>
                <p className="text-muted-foreground">
                    The opportunity you're looking for doesn't exist or you don't have permission to view it.
                </p>
                <Button asChild variant="outline">
                    <Link href="/home/opportunities">Back to Opportunities</Link>
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="border-b bg-background px-6 py-4">
                <div className="mb-4 flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href="/home/opportunities">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                </div>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{opportunity.opportunity_name}</h1>
                            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                {opportunity.account && (
                                    <Link href={`/home/accounts/${opportunity.account.id}`} className="flex items-center gap-1 text-primary hover:underline">
                                        <Building2 className="h-3 w-3" />
                                        {opportunity.account.account_name}
                                    </Link>
                                )}
                                {opportunity.type && (
                                    <span className="flex items-center gap-1">
                                        • {opportunity.type}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {opportunity.stage && (
                            <Badge
                                variant="secondary"
                                style={{
                                    backgroundColor: `${opportunity.stage.color}20`,
                                    color: opportunity.stage.color,
                                    borderColor: opportunity.stage.color,
                                }}
                            >
                                {opportunity.stage.status_name}
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
                                    <p className="text-sm font-medium text-muted-foreground">Amount</p>
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-lg font-semibold">
                                            {new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency: opportunity.currency || 'USD',
                                            }).format(opportunity.amount || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Expected Revenue</p>
                                    <div className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            {new Intl.NumberFormat('en-US', {
                                                style: 'currency',
                                                currency: opportunity.currency || 'USD',
                                            }).format(opportunity.expected_revenue || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Expected Close Date</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            {opportunity.expected_close_date
                                                ? new Date(opportunity.expected_close_date).toLocaleDateString()
                                                : '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Probability</p>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{opportunity.probability}%</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Priority</p>
                                    <div className="flex items-center gap-2">
                                        <Flag className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm capitalize">{opportunity.priority || '-'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Lead Source</p>
                                    <span className="text-sm capitalize">{opportunity.lead_source || '-'}</span>
                                </div>

                            </CardContent>
                        </Card>

                        {/* Notes Section */}
                        <EntityNotes
                            entityType="opportunity"
                            entityId={id}
                        />

                        {/* Activity Sections */}
                        <EntityReminders entityType="opportunity" entityId={id} />
                        <EntityMeetings entityType="opportunity" entityId={id} />
                        <EntityDocuments entityType="opportunity" entityId={id} />
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
                                        <span className="text-sm">{opportunity.owner?.name || '-'}</span>
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Created At</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span className="text-sm">{new Date(opportunity.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span className="text-sm">{new Date(opportunity.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageBody>
        </>
    );
}

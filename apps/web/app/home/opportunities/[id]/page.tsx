'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, User, Calendar, FileText, CheckCircle, Wallet, Target, Flag, Tag } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@kit/ui/select';
import { toast } from 'sonner';

import { getOpportunityByIdService, updateOpportunityService } from '~/services/opportunities.service';
import { EntityNotes } from '../../_components/entity-notes';
import { EntityDocuments, EntityMeetings, EntityReminders } from '../../_components/entity-activity';
import { PublicPrivateToggle } from '../../_components/public-private-toggle';
import { EditOpportunityDialog } from '../components/edit-opportunity-dialog';
import { OpportunityStatusTimeline } from '../components/opportunity-status-timeline';
import { OpportunityAssignees } from '../components/opportunity-assignees';
import { usePermissionDetail, useCanAccessData } from '~/lib/permissions/use-permissions';
import { useUser } from '@kit/supabase/hooks/use-user';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getOpportunityStatusesService } from '~/services/opportunities.service';
import { ModuleGuard } from '~/lib/rbac/module-guard';

export default function OpportunityDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const {
        data: opportunity,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['opportunity', id],
        queryFn: () => getOpportunityByIdService(id),
        enabled: !!id,
    });

    const { currentWorkspace } = useRBAC();
    const { data: stages = [] } = useQuery({
        queryKey: ['opportunity-stages', currentWorkspace?.id],
        queryFn: () => getOpportunityStatusesService(currentWorkspace!.id),
        enabled: !!currentWorkspace?.id,
    });

    const { data: user } = useUser();
    const editPermission = usePermissionDetail('opportunities', 'edit');
    const canEdit = useCanAccessData(editPermission, opportunity?.owner_id, user?.id);

    if (isLoading) {
        return (
            <ModuleGuard module="opportunities">
                <div className="flex h-screen items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            </ModuleGuard>
        );
    }

    if (error || !opportunity) {
        return (
            <ModuleGuard module="opportunities">
                <div className="flex h-screen flex-col items-center justify-center gap-4">
                    <h1 className="text-2xl font-bold">Opportunity Not Found</h1>
                    <p className="text-muted-foreground">
                        The opportunity you're looking for doesn't exist or you don't have permission to view it.
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/home/opportunities">Back to Opportunities</Link>
                    </Button>
                </div>
            </ModuleGuard>
        );
    }

    return (
        <ModuleGuard module="opportunities">
            <div className="border-b bg-background px-6 py-4">
                <div className="mb-4 flex items-center justify-between">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href="/home/opportunities">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        <Select
                            value={opportunity.stage_id}
                            onValueChange={async (value) => {
                                try {
                                    await updateOpportunityService(id, { stage_id: value });
                                    toast.success('Opportunity stage updated');
                                    refetch();
                                } catch (error) {
                                    toast.error('Failed to update stage');
                                }
                            }}
                            disabled={!canEdit}
                        >
                            <SelectTrigger className="w-[180px] h-9">
                                <SelectValue placeholder="Update Stage" />
                            </SelectTrigger>
                            <SelectContent>
                                {stages.map((stage: any) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="h-2 w-2 rounded-full"
                                                style={{ backgroundColor: stage.color }}
                                            />
                                            {stage.status_name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditDialogOpen(true)}
                            disabled={!canEdit}
                            title={!canEdit ? "You do not have permission to edit this opportunity" : ""}
                        >
                            Edit Opportunity
                        </Button>
                    </div>
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

            <div className="bg-slate-50/50 border-b py-6 px-6">
                <div className="max-w-5xl mx-auto overflow-hidden rounded-xl border bg-white/50 backdrop-blur-sm shadow-sm p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 text-center">Opportunity Sales Pipeline</p>
                    <OpportunityStatusTimeline
                        opportunityId={id}
                        currentStatusId={opportunity.stage_id}
                        statuses={stages}
                        onStatusChange={refetch}
                        canEdit={canEdit}
                    />
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

                        {/* Opportunity Assignees Section */}
                        {currentWorkspace?.id && (
                            <OpportunityAssignees opportunityId={id} workspaceId={currentWorkspace.id} />
                        )}

                        {/* Public/Private Toggle */}
                        {currentWorkspace?.id && opportunity && (
                            <PublicPrivateToggle
                                entityType="opportunity"
                                entityId={id}
                                isPublic={opportunity.is_public}
                                createdBy={opportunity.created_by}
                                workspaceId={currentWorkspace.id}
                            />
                        )}

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

            <EditOpportunityDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                opportunity={opportunity}
            />
        </ModuleGuard>
    );
}

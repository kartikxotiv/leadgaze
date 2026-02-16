'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Flag,
  Tag,
  Target,
  User,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';

import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getOpportunityByIdService,
  updateOpportunityService,
} from '~/services/opportunities.service';
import { getOpportunityStatusesService } from '~/services/opportunities.service';

import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityNotes } from '../../_components/entity-notes';
import { PublicPrivateToggle } from '../../_components/public-private-toggle';
import { EditOpportunityDialog } from '../components/edit-opportunity-dialog';
import { OpportunityAssignees } from '../components/opportunity-assignees';
import { OpportunityDialog } from '../components/opportunity-dialog';
import { OpportunityStatusTimeline } from '../components/opportunity-status-timeline';

export default function OpportunityDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const {
    data: opportunity,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => getOpportunityByIdService(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (opportunity) {
      console.log('[DEBUG] Opportunity:', opportunity);
    }
  }, [opportunity]);

  const { currentWorkspace, canAccess: rbacCanAccess } = useRBAC();
  const { data: stages = [] } = useQuery({
    queryKey: ['opportunity-stages', currentWorkspace?.id],
    queryFn: () => getOpportunityStatusesService(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  const { data: user } = useUser();
  const editPermission = usePermissionDetail('opportunities', 'edit');
  const canEdit = useCanAccessData(
    editPermission,
    opportunity?.owner_id,
    user?.id,
  );

  const changeStagePermission = usePermissionDetail(
    'opportunities',
    'change_stage',
  );
  const canChangeStage = useCanAccessData(
    changeStagePermission,
    opportunity?.owner_id,
    user?.id,
  );

  const closeWonPermission = usePermissionDetail('opportunities', 'close_won');
  const canCloseWon = useCanAccessData(
    closeWonPermission,
    opportunity?.owner_id,
    user?.id,
  );

  const closeLostPermission = usePermissionDetail(
    'opportunities',
    'close_lost',
  );
  const canCloseLost = useCanAccessData(
    closeLostPermission,
    opportunity?.owner_id,
    user?.id,
  );

  if (isLoading) {
    return (
      <ModuleGuard module="opportunities">
        <div className="flex h-screen items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
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
            The opportunity you're looking for doesn't exist or you don't have
            permission to view it.
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
      <div className="bg-background border-b px-6 py-4">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/home/opportunities">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex gap-2">
            {rbacCanAccess('opportunities', 'change_stage') && (
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
                disabled={!canChangeStage}
              >
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Update Stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages
                    .filter((stage: any) => {
                      const isWon =
                        stage.status_name.toLowerCase().includes('won') ||
                        stage.is_won;
                      const isLost =
                        stage.status_name.toLowerCase().includes('lost') ||
                        stage.is_lost;

                      if (isWon && !canCloseWon) return false;
                      if (isLost && !canCloseLost) return false;
                      return true;
                    })
                    .map((stage: any) => (
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
            )}
            {rbacCanAccess('opportunities', 'close_won') && (
              <Button
                variant="outline"
                size="sm"
                className="border-green-600 text-green-600 hover:bg-green-50"
                disabled={!canCloseWon}
                onClick={async () => {
                  const wonStage = stages.find(
                    (s: any) =>
                      s.status_name.toLowerCase().includes('won') || s.is_won,
                  );
                  if (wonStage) {
                    try {
                      await updateOpportunityService(id, {
                        stage_id: wonStage.id,
                        is_closed: true,
                        is_won: true,
                      });
                      toast.success('Opportunity marked as Won');
                      refetch();
                    } catch (error) {
                      toast.error('Failed to update status');
                    }
                  }
                }}
              >
                Close as Won
              </Button>
            )}
            {rbacCanAccess('opportunities', 'close_lost') && (
              <Button
                variant="outline"
                size="sm"
                className="border-red-600 text-red-600 hover:bg-red-50"
                disabled={!canCloseLost}
                onClick={async () => {
                  const lostStage = stages.find(
                    (s: any) =>
                      s.status_name.toLowerCase().includes('lost') || s.is_lost,
                  );
                  if (lostStage) {
                    try {
                      await updateOpportunityService(id, {
                        stage_id: lostStage.id,
                        is_closed: true,
                        is_won: false,
                      });
                      toast.success('Opportunity marked as Lost');
                      refetch();
                    } catch (error) {
                      toast.error('Failed to update status');
                    }
                  }
                }}
              >
                Close as Lost
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
              >
                Edit Opportunity
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg">
              <FileText className="text-primary h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {opportunity.opportunity_name}
              </h1>
              <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
                {opportunity.account && (
                  <Link
                    href={`/home/accounts/${opportunity.account.id}`}
                    className="text-primary flex items-center gap-1 hover:underline"
                  >
                    <Building2 className="h-3 w-3" />
                    {opportunity.account.account_name}
                  </Link>
                )}
                {opportunity.type && (
                  <span className="flex items-center gap-1">
                    • {opportunity.type}
                  </span>
                )}
                <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>
                    Created on{' '}
                    {new Date(opportunity.created_at).toLocaleDateString(
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

      <div className="border-b px-6 py-6">
        <div className="bg-card mx-auto max-w-5xl overflow-hidden rounded-xl border p-4 shadow-sm backdrop-blur-sm">
          <p className="text-muted-foreground mb-4 text-center text-[10px] font-bold tracking-widest uppercase">
            Opportunity Sales Pipeline
          </p>
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
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Amount
                  </p>
                  <div className="flex items-center gap-2">
                    <Wallet className="text-muted-foreground h-4 w-4" />
                    <span className="text-lg font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: opportunity.currency || 'USD',
                      }).format(opportunity.amount || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Expected Revenue
                  </p>
                  <div className="flex items-center gap-2">
                    <Target className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: opportunity.currency || 'USD',
                      }).format(opportunity.expected_revenue || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Expected Close Date
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm">
                      {opportunity.expected_close_date
                        ? new Date(
                            opportunity.expected_close_date,
                          ).toLocaleDateString()
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Probability
                  </p>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm">{opportunity.probability}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Priority
                  </p>
                  <div className="flex items-center gap-2">
                    <Flag className="text-muted-foreground h-4 w-4" />
                    <span className="text-sm capitalize">
                      {opportunity.priority || '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm font-medium">
                    Lead Source
                  </p>
                  <span className="text-sm">
                    {opportunity.lead_source || '-'}
                  </span>
                </div>

                {opportunity.description && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">
                      Description
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {opportunity.description}
                    </p>
                  </div>
                )}

                {opportunity.competitor && (
                  <div className="col-span-2 space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">
                      Competitor
                    </p>
                    <span className="text-sm">{opportunity.competitor}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Opportunity Assignees Section */}
            {currentWorkspace?.id && (
              <OpportunityAssignees
                opportunityId={id}
                workspaceId={currentWorkspace.id}
              />
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
            <EntityNotes entityType="opportunity" entityId={id} />

            {/* Activity Sections */}
            <EntityReminders entityType="opportunity" entityId={id} />
            <EntityMeetings entityType="opportunity" entityId={id} />
            <EntityDocuments entityType="opportunity" entityId={id} />
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
                      {opportunity.owner?.name || '-'}
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
                      {new Date(opportunity.created_at).toLocaleDateString()}
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
                      {new Date(opportunity.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>

      <OpportunityDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        opportunity={opportunity}
      />
    </ModuleGuard>
  );
}

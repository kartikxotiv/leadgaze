'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import { Skeleton } from '@kit/ui/skeleton';

import { Opportunity } from '~/services/opportunities.service';

import { OpportunitiesKanbanCard } from './opportunities-kanban-card';
import { OpportunitiesKanbanColumn } from './opportunities-kanban-column';

interface Stage {
  id: string;
  status_name: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

interface OpportunitiesKanbanBoardProps {
  opportunities: Opportunity[];
  stages: Stage[];
  isLoading: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
  onOpportunityClick: (id: string) => void;
  onDelete: (opportunity: Opportunity) => void;
  onStageChange: (opportunityId: string, newStageId: string) => Promise<void>;
  onCreateOpportunity: () => void;
}

// ---------------------------------------------------------------------------
// Full-board skeleton
// ---------------------------------------------------------------------------
function KanbanBoardSkeleton() {
  // Show 5 skeleton columns (same as a typical status set)
  const SKELETON_COLUMNS = 5;
  // Each column gets a different number of card skeletons for a realistic look
  const CARD_COUNTS = [3, 2, 3, 2, 1];

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto pb-3 pr-2">
      {Array.from({ length: SKELETON_COLUMNS }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="flex w-[300px] shrink-0 flex-col rounded-xl border border-border/60 bg-zinc-100/60 shadow-sm dark:border-border/40 dark:bg-zinc-900/30 overflow-hidden"
        >
          {/* Skeleton Top Status Color Bar */}
          <div className="h-1.5 w-full bg-muted-foreground/20" />

          {/* Skeleton column header */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-background/40">
            <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>

          {/* Skeleton card list */}
          <div className="flex flex-1 flex-col gap-2.5 px-2 pt-2.5 pb-2">
            {Array.from({ length: CARD_COUNTS[colIdx] ?? 2 }).map(
              (_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="rounded-lg border bg-white dark:bg-[#22272b] dark:border-white/10 p-3 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main board
// ---------------------------------------------------------------------------
export function OpportunitiesKanbanBoard({
  opportunities,
  stages,
  isLoading,
  canUpdate,
  canDelete,
  canCreate,
  onOpportunityClick,
  onDelete,
  onStageChange,
  onCreateOpportunity,
}: OpportunitiesKanbanBoardProps) {
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
  const [optimisticOpportunities, setOptimisticOpportunities] = useState<Opportunity[] | null>(null);

  // Clear optimistic state as soon as the server data (opportunities prop) updates.
  useEffect(() => {
    setOptimisticOpportunities(null);
  }, [opportunities]);

  // Configure sensors: mouse, touch and keyboard
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  // Sort stages by sort_order, but always force "New" to index 0
  const sortedStages = useMemo(() => {
    // Collect any stages present on opportunities but missing from the main stages list
    const missingStagesMap = new Map<string, Stage>();
    opportunities.forEach((opp) => {
      if (opp.stage_id && !stages.find((s) => s.id === opp.stage_id)) {
        if (!missingStagesMap.has(opp.stage_id) && opp.stage) {
          missingStagesMap.set(opp.stage_id, {
            id: opp.stage_id,
            status_name: opp.stage.status_name,
            color: opp.stage.color,
            icon: opp.stage.icon,
            sort_order: -999, // push missing ones to front by default
          });
        }
      }
    });

    const combinedStages = [...stages, ...Array.from(missingStagesMap.values())];

    return combinedStages.sort((a, b) => {
      const aIsNew = a.status_name.toLowerCase() === 'new';
      const bIsNew = b.status_name.toLowerCase() === 'new';
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }, [stages, opportunities]);

  // The current opportunity list (optimistic override or server data)
  const currentOpportunities = optimisticOpportunities ?? opportunities;

  // Group opportunities by stage_id
  const opportunitiesByStage = useMemo(() => {
    const map = new Map<string, Opportunity[]>();
    sortedStages.forEach((s) => map.set(s.id, []));
    currentOpportunities.forEach((opp) => {
      const bucket = map.get(opp.stage_id);
      if (bucket) bucket.push(opp);
    });
    return map;
  }, [currentOpportunities, sortedStages]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const opp = currentOpportunities.find((o) => o.id === event.active.id);
      setActiveOpportunity(opp ?? null);
    },
    [currentOpportunities],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveOpportunity(null);

      if (!over) return;

      const draggedOppId = active.id as string;
      const targetStageId = over.id as string;

      const draggedOpp = currentOpportunities.find((o) => o.id === draggedOppId);
      if (!draggedOpp) return;

      // No change if dropped on same column
      if (draggedOpp.stage_id === targetStageId) return;

      // Prevent dropping INTO "New" stage (can only drag out of it)
      const targetStage = sortedStages.find((s) => s.id === targetStageId);
      if (targetStage && targetStage.status_name.toLowerCase() === 'new') {
        return;
      }

      // Optimistic update
      const snapshot = currentOpportunities;
      setOptimisticOpportunities(
        currentOpportunities.map((o) =>
          o.id === draggedOppId ? { ...o, stage_id: targetStageId } : o,
        ),
      );

      try {
        await onStageChange(draggedOppId, targetStageId);
        // Do NOT clear optimisticOpportunities here. The useEffect above will clear it
        // once the parent's refetch completes and passes new `opportunities` prop.
      } catch {
        // Revert optimistic update on API failure
        setOptimisticOpportunities(snapshot);
      }
    },
    [currentOpportunities, onStageChange],
  );

  const handleDragCancel = useCallback(() => {
    setActiveOpportunity(null);
  }, []);

  // Show full-board skeleton while loading (replaces the real board entirely)
  if (isLoading) {
    return <KanbanBoardSkeleton />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Horizontal scrolling board */}
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto pb-3 pr-2 pl-[1px]">
        {sortedStages.map((stage) => (
          <OpportunitiesKanbanColumn
            key={stage.id}
            stage={stage}
            opportunities={opportunitiesByStage.get(stage.id) ?? []}
            isLoading={false}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canCreate={canCreate}
            onOpportunityClick={onOpportunityClick}
            onDelete={onDelete}
            onCreateOpportunity={onCreateOpportunity}
          />
        ))}

        {/* Fallback: no stages */}
        {sortedStages.length === 0 && (
          <div className="flex w-full items-center justify-center text-muted-foreground text-sm py-16">
            No stages configured. Go to Settings → Status Management to add
            stages.
          </div>
        )}
      </div>

      {/* Drag overlay: floating ghost card while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeOpportunity ? (
          <div className="w-[284px] rotate-1 opacity-95 shadow-2xl ring-2 ring-primary/40 rounded-lg">
            <OpportunitiesKanbanCard
              opportunity={activeOpportunity}
              canUpdate={false}
              canDelete={false}
              onClick={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

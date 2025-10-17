"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePipeline } from "@/hooks/use-pipeline";
import { useLeads } from "@/hooks/use-leads";
import { DataSkeleton } from "@/components/skeletons/data-skeleton";
import {
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { useState } from "react";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DealCardProps {
  deal: Deal;
  getDealTitle: (deal: Deal) => string;
  getDealStatus: (deal: Deal) => string;
}

function DealCard({ deal, getDealTitle, getDealStatus }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-white dark:bg-gray-900 border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${
        isDragging ? "shadow-lg border-blue-300 dark:border-blue-600" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="font-medium text-sm flex-1">{getDealTitle(deal)}</div>
          <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-green-600">
            ${deal.value.toLocaleString()}
          </span>
          <span className="text-muted-foreground">{deal.probability}%</span>
        </div>
        {deal.expected_close_date && (
          <div className="text-xs text-muted-foreground">
            Due: {new Date(deal.expected_close_date).toLocaleDateString()}
          </div>
        )}
        <div className="flex items-center justify-between">
          <Badge
            variant={getDealStatus(deal) === "Won" ? "default" : "secondary"}
            className="text-xs"
          >
            {getDealStatus(deal)}
          </Badge>
          {deal.notes && (
            <div className="text-xs text-muted-foreground truncate max-w-[100px]">
              {deal.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DroppableStageProps {
  stage: any;
  deals: Deal[];
  getDealTitle: (deal: Deal) => string;
  getDealStatus: (deal: Deal) => string;
  stageValue: number;
}

function DroppableStage({
  stage,
  deals,
  getDealTitle,
  getDealStatus,
  stageValue,
}: DroppableStageProps) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-sm font-medium flex items-center gap-2"
            style={{ color: stage.color }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            {stage.name}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {deals.length}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          ${stageValue.toLocaleString()}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <SortableContext
          items={deals.map((deal) => deal.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-gray-50 dark:bg-gray-800/20">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                getDealTitle={getDealTitle}
                getDealStatus={getDealStatus}
              />
            ))}

            {}
            {deals.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                Drop deals here
              </div>
            )}
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

export default function PipelinePage() {
  const { deals, stages, updateDeal, loading } = usePipeline();
  const { leads } = useLeads();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const avgDealSize = deals.length > 0 ? totalValue / deals.length : 0;

  const getDealTitle = (deal: Deal) => {
    const lead = leads.find((l) => l.id === deal.lead_id);
    return lead ? lead.company_name : "Unknown Company";
  };

  const getDealStatus = (deal: Deal) => {
    const stage = stages.find((s) => s.id === deal.stage_id);
    if (!stage) return "Unknown";

    if (
      stage.name.toLowerCase().includes("closed won") ||
      stage.name.toLowerCase().includes("won")
    ) {
      return "Won";
    }
    if (
      stage.name.toLowerCase().includes("closed lost") ||
      stage.name.toLowerCase().includes("lost")
    ) {
      return "Lost";
    }
    return "Open";
  };

  const getStageDeals = (stageId: string) => {
    return deals.filter((deal) => deal.stage_id === stageId);
  };

  if (loading) {
    return (
      <MainLayout title="Sales Pipeline" description="Loading pipeline data...">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <DataSkeleton type="pipeline" />
        </div>
      </MainLayout>
    );
  }

  const getStageValue = (stageId: string) => {
    return getStageDeals(stageId).reduce((sum, deal) => sum + deal.value, 0);
  };

  const wonDeals = deals.filter((d) => getDealStatus(d) === "Won");
  const winRate =
    deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0;

  const activeDeal = activeId
    ? deals.find((deal) => deal.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

   
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

   
    updateDeal(activeId, { stage_id: overContainer });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

   
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId) || overId;

    if (!activeContainer || !overContainer) {
      setActiveId(null);
      return;
    }

    if (activeContainer !== overContainer) {
     
      updateDeal(activeId, { stage_id: overContainer });
    }

    setActiveId(null);
  }

  function findContainer(id: string) {
   
    if (stages.find((stage) => stage.id === id)) {
      return id;
    }

   
    for (const stage of stages) {
      if (deals.find((deal) => deal.id === id && deal.stage_id === stage.id)) {
        return stage.id;
      }
    }

    return null;
  }

  return (
    <MainLayout
      title="Sales Pipeline"
      description="Visualize and manage your sales pipeline with drag-and-drop functionality"
      actions={
        <Button asChild>
          <Link href="/deals/new">
            <Plus className="w-4 h-4 mr-2" />
            New Deal
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pipeline
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalValue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Deals
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deals.length}</div>
              <p className="text-xs text-muted-foreground">In pipeline</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Deal Size
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${Math.round(avgDealSize).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Average value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{winRate}%</div>
              <p className="text-xs text-muted-foreground">Conversion rate</p>
            </CardContent>
          </Card>
        </div>

        {}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pipeline Kanban Board</h2>
            <div className="text-sm text-muted-foreground">
              Drag deals between stages to update their status
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {stages.map((stage) => {
                const stageDeals = getStageDeals(stage.id);
                const stageValue = getStageValue(stage.id);

                return (
                  <DroppableStage
                    key={stage.id}
                    stage={stage}
                    deals={stageDeals}
                    getDealTitle={getDealTitle}
                    getDealStatus={getDealStatus}
                    stageValue={stageValue}
                  />
                );
              })}
            </div>

            <DragOverlay>
              {activeId && activeDeal ? (
                <DealCard
                  deal={activeDeal}
                  getDealTitle={getDealTitle}
                  getDealStatus={getDealStatus}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {}
        <Card>
          <CardHeader>
            <CardTitle>Recent Pipeline Activity</CardTitle>
            <CardDescription>
              Latest updates to your sales pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deals.slice(0, 5).map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{getDealTitle(deal)}</p>
                    <p className="text-sm text-muted-foreground">
                      Last updated:{" "}
                      {new Date(deal.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        getDealStatus(deal) === "Won"
                          ? "default"
                          : getDealStatus(deal) === "Lost"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {getDealStatus(deal)}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      ${deal.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

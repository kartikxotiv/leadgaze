"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { useDealsByStage, useUpdateDeal, type Deal } from "@/hooks/use-deals";
import { CreateDealForm } from "./create-deal-form";
import {
  Plus,
  DollarSign,
  Calendar,
  User,
  Building2,
  Phone,
  Mail,
  MoreHorizontal,
  TrendingUp,
  Clock,
  Target,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DealsPipelineProps {
  className?: string;
}

const dealStages = [
  {
    id: "qualification",
    name: "Qualification",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    probability: 20,
  },
  {
    id: "proposal",
    name: "Proposal",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    probability: 40,
  },
  {
    id: "negotiation",
    name: "Negotiation",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    probability: 70,
  },
  {
    id: "decision",
    name: "Decision",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    probability: 90,
  },
  {
    id: "closed_won",
    name: "Closed Won",
    color: "bg-green-100 text-green-800 border-green-200",
    probability: 100,
  },
  {
    id: "closed_lost",
    name: "Closed Lost",
    color: "bg-red-100 text-red-800 border-red-200",
    probability: 0,
  },
];

const getPriorityColor = (priority: Deal["priority"]) => {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-blue-500";
    case "low":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
};

function DealCard({ deal, isDragging }: { deal: Deal; isDragging?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: deal.dealId,
    data: {
      type: "deal",
      deal: deal,
    },
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging || isSortableDragging ? 0.7 : 1,
    zIndex: isDragging || isSortableDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        (isDragging || isSortableDragging) && "rotate-2 scale-105 shadow-xl"
      )}
    >
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 w-full bg-white dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-6 truncate">
                {deal.title}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {deal.lead?.businessName ||
                  `${deal.lead?.firstName} ${deal.lead?.lastName}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  getPriorityColor(deal.priority)
                )}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Edit Deal</DropdownMenuItem>
                  <DropdownMenuItem>Add Activity</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-green-600">
                <DollarSign className="h-3 w-3" />
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: deal.currency || "USD",
                }).format(deal.value)}
              </span>
              <Badge variant="outline" className="text-xs">
                {deal.probability}%
              </Badge>
            </div>

            {deal.expectedCloseDate && (
              <div className="flex items-center gap-1 text-gray-500">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(deal.expectedCloseDate), "MMM d, yyyy")}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1 text-gray-500">
              <User className="h-3 w-3" />
              <span className="truncate">
                {deal.user?.firstName} {deal.user?.lastName}
              </span>
            </div>

            {deal.lead?.email && (
              <div className="flex items-center gap-1 text-gray-500">
                <Mail className="h-3 w-3" />
                <span className="truncate">{deal.lead.email}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                deal.priority === "urgent" && "border-red-400 text-red-600",
                deal.priority === "high" && "border-orange-400 text-orange-600",
                deal.priority === "medium" && "border-blue-400 text-blue-600",
                deal.priority === "low" && "border-gray-400 text-gray-600"
              )}
            >
              {deal.priority}
            </Badge>
            <span className="text-xs text-gray-400">
              {format(new Date(deal.createdAt), "MMM d")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
}: {
  stage: (typeof dealStages)[0];
  deals: Deal[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: "stage",
      stage: stage,
    },
  });

  const totalValue = deals.reduce(
    (sum, deal) => sum + parseFloat(deal.value.toString()),
    0
  );

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <Badge variant="outline" className={stage.color}>
            {deals.length}
          </Badge>
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="h-3 w-3" />
            <span>
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(totalValue)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{stage.probability}% avg probability</span>
          </div>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-3 rounded-lg border-2 border-dashed transition-all duration-200",
          isOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20 scale-[1.02]"
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300",
          deals.length === 0 && "bg-gray-50/50 dark:bg-gray-900/30"
        )}
      >
        <SortableContext
          items={deals.map((deal) => deal.dealId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 min-h-[250px]">
            {deals.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                <div className="text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-xs font-medium">No deals yet</div>
                  <div className="text-xs opacity-70">Drop deals here</div>
                </div>
              </div>
            ) : (
              deals.map((deal) => <DealCard key={deal.dealId} deal={deal} />)
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

export function DealsPipeline({ className }: DealsPipelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateDeal, setShowCreateDeal] = useState(false);

  const { data: dealsByStage, isLoading, error } = useDealsByStage();
  const updateDealMutation = useUpdateDeal();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const dealId = active.id as string;
    const newStageId = over.id as string;

    console.log("🔄 Drag and Drop Debug:", {
      activeId: active.id,
      activeIdType: typeof active.id,
      overId: over.id,
      overIdType: typeof over.id,
      dealId,
      newStageId,
      "Is newStageId a UUID?":
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          newStageId
        ),
      availableStages: dealStages.map((s) => ({ id: s.id, name: s.name })),
    });

   
    const overData: any = (over as any).data?.current;
    let targetStageId: string = newStageId;
    if (overData?.type === "deal") {
      for (const [stageKey, stageDeals] of Object.entries(dealsByStage || {})) {
        const isInThisStage = (stageDeals as Deal[]).some(
          (d) => d.dealId === (over.id as string)
        );
        if (isInThisStage) {
          targetStageId = stageKey;
          break;
        }
      }
    } else if (overData?.type === "stage") {
      targetStageId = newStageId;
    }

   
    let dealToMove: Deal | undefined;
    for (const stageDeals of Object.values(dealsByStage || {})) {
      dealToMove = (stageDeals as Deal[]).find(
        (deal) => deal.dealId === dealId
      );
      if (dealToMove) break;
    }

    if (!dealToMove) {
      console.error("❌ Deal not found:", dealId);
      toast.error("Deal not found");
      return;
    }

    if (dealToMove.stage === targetStageId) {
      return;
    }

   
    const validStages = [
      "qualification",
      "proposal",
      "negotiation",
      "decision",
      "closed_won",
      "closed_lost",
    ];
    if (!validStages.includes(targetStageId)) {
      console.error(
        "❌ Invalid stage ID:",
        targetStageId,
        "Valid stages:",
        validStages
      );
      toast.error("Invalid drop target");
      return;
    }

    try {
     
      const stage = dealStages.find((s) => s.id === targetStageId);
      const probability = stage?.probability || dealToMove.probability;

      await updateDealMutation.mutateAsync({
        dealId,
        data: {
          stage: targetStageId as Deal["stage"],
          probability,
          ...(targetStageId === "closed_won" && {
            actualCloseDate: new Date().toISOString(),
          }),
          ...(targetStageId === "closed_lost" && {
            actualCloseDate: new Date().toISOString(),
          }),
        },
      });

      toast.success(`Deal moved to ${stage?.name || targetStageId}`);
    } catch (error) {
      toast.error("Failed to update deal");
      console.error("Deal update error:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Target className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Failed to load pipeline
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeDeal = activeId
    ? Object.values(dealsByStage || {})
        .flat()
        .find((deal: any) => deal.dealId === activeId)
    : null;

  return (
    <div className={cn("w-full", className)}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sales Pipeline
            </CardTitle>
            <CardDescription>
              Drag and drop deals between stages to update their status
            </CardDescription>
          </div>
          <Dialog open={showCreateDeal} onOpenChange={setShowCreateDeal}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Deal</DialogTitle>
              </DialogHeader>
              <CreateDealForm
                onSuccess={() => setShowCreateDeal(false)}
                onCancel={() => setShowCreateDeal(false)}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={closestCenter}
          >
            <div className="flex gap-6 overflow-x-auto pb-4">
              {dealStages.map((stage) => {
                const stageDeals = (dealsByStage?.[stage.id] || []) as Deal[];
                return (
                  <div key={stage.id} className="flex-shrink-0 w-80">
                    <StageColumn stage={stage} deals={stageDeals} />
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
}

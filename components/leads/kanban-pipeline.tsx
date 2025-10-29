"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Edit,
  Trash2,
  Eye,
  Star,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Lead } from "@/hooks/use-leads";
import { toast } from "sonner";
import Link from "next/link";

interface KanbanPipelineProps {
  leads: Lead[];
  statuses: Array<{
    id: string;
    entityValue: string;
    entityType: string;
    label?: string;
  }>;
  onLeadUpdate: (leadId: string, newStatusId: string) => Promise<void>;
  onLeadClick?: (lead: Lead) => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  leads: Lead[];
  color: string;
  bgColor: string;
  textColor: string;
}

const getStatusColorScheme = (statusValue: string) => {
  switch (statusValue?.toLowerCase()) {
    case "new":
      return {
        color: "border-blue-200 bg-blue-50",
        bgColor: "bg-blue-500",
        textColor: "text-blue-600",
      };
    case "contact_attempted":
      return {
        color: "border-yellow-200 bg-yellow-50",
        bgColor: "bg-yellow-500",
        textColor: "text-yellow-600",
      };
    case "in_conversation":
      return {
        color: "border-purple-200 bg-purple-50",
        bgColor: "bg-purple-500",
        textColor: "text-purple-600",
      };
    case "qualified":
      return {
        color: "border-green-200 bg-green-50",
        bgColor: "bg-green-500",
        textColor: "text-green-600",
      };
    case "disqualified":
      return {
        color: "border-red-200 bg-red-50",
        bgColor: "bg-red-500",
        textColor: "text-red-600",
      };
    case "not_reachable":
      return {
        color: "border-gray-200 bg-gray-50",
        bgColor: "bg-gray-500",
        textColor: "text-gray-600",
      };
    default:
      return {
        color: "border-gray-200 bg-gray-50",
        bgColor: "bg-gray-500",
        textColor: "text-gray-600",
      };
  }
};

const getGradeColor = (gradeName: string) => {
  switch (gradeName?.toLowerCase()) {
    case "hot":
      return "bg-red-500";
    case "warm":
      return "bg-orange-500";
    case "cold":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
};

function DroppableColumn({
  column,
  onLeadClick,
}: {
  column: KanbanColumn;
  onLeadClick?: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const leadIds = column.leads.map((lead) => lead.leadId);

  return (
    <div className="flex-shrink-0 w-80">
      <Card
        className={`h-full flex flex-col border-t-4 ${column.color} overflow-hidden`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${column.bgColor}`} />
              {column.title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {column.leads.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent
          ref={setNodeRef}
          className={`flex-1 overflow-y-auto overflow-x-hidden transition-colors ${
            isOver ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
          }`}
        >
          <SortableContext
            items={leadIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-[200px] min-w-0">
              {column.leads.map((lead) => (
                <SortableLeadCard
                  key={lead.leadId}
                  lead={lead}
                  onLeadClick={onLeadClick}
                />
              ))}
            </div>
          </SortableContext>

          {column.leads.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <User className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm">No leads in this stage</p>
              <p className="text-xs mt-1">
                Drag leads here to update their status
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SortableLeadCard({
  lead,
  onLeadClick,
}: {
  lead: Lead;
  onLeadClick?: (lead: Lead) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.leadId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-full transition-all duration-200 ${
        isDragging ? "opacity-70 scale-[1.03] z-50" : "hover:shadow-md"
      }`}
    >
      <LeadCard lead={lead} onLeadClick={onLeadClick} />
    </div>
  );
}

function LeadCard({
  lead,
  onLeadClick,
}: {
  lead: Lead;
  onLeadClick?: (lead: Lead) => void;
}) {
  const grade = lead.scoreGrade;

  return (
    <Card className="w-full overflow-hidden cursor-pointer border-l-4 border-l-current bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <CardContent className="p-4">
        {}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {(lead.firstName?.[0] + lead.lastName?.[0]).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm truncate">
                {lead.firstName} {lead.lastName}
              </h4>
              {lead.jobTitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {lead.jobTitle}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/pages/leads/${lead.leadId}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLeadClick?.(lead)}>
                <Edit className="h-4 w-4 mr-2" />
                Quick Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Call
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {}
        {lead.businessName && (
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate break-all">
              {lead.businessName}
            </span>
          </div>
        )}

        {}
        <div className="space-y-1 mb-3">
          {lead.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate break-all">
                {lead.email}
              </span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate break-all">
                {lead.phone}
              </span>
            </div>
          )}
        </div>

        {}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            <span className="text-xs font-medium">{lead.leadScore}/100</span>
            <div className="w-12">
              <Progress value={Math.min(lead.leadScore, 100)} className="h-1" />
            </div>
          </div>
          {grade && (
            <div className="flex items-center gap-1">
              <div
                className={`w-2 h-2 rounded-full ${getGradeColor(
                  grade.entityValue
                )}`}
              />
              <span className="text-xs font-medium capitalize">
                {grade.entityValue}
              </span>
            </div>
          )}
        </div>

        {}
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {lead.tags.slice(0, 2).map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs px-2 py-0"
              >
                {tag}
              </Badge>
            ))}
            {lead.tags.length > 2 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                +{lead.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="h-3 w-3" />
          <span>Updated {new Date(lead.updatedAt).toLocaleDateString()}</span>
        </div>

        {}
        {lead.assignedUser && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <User className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {lead.assignedUser.firstName} {lead.assignedUser.lastName}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KanbanPipeline({
  leads,
  statuses,
  onLeadUpdate,
  onLeadClick,
}: KanbanPipelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

 
  const getShortStatusName = (entityValue: string) => {
    const statusMap: Record<string, string> = {
      new: "New",
      contact_attempted: "Contacted",
      in_conversation: "In Conversation",
      qualified: "Qualified",
      disqualified: "Disqualified",
      not_reachable: "Not Reachable",
    };
    return (
      statusMap[entityValue] ||
      entityValue
        ?.replace("_", " ")
        .replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
      "Unknown"
    );
  };

 
  const columns: KanbanColumn[] = useMemo(() => {
    return statuses.map((status: any) => {
      const statusLeads = leads.filter((lead) => lead.statusId === status.id);
      const statusValue: string = status?.entityValue ?? status?.value ?? "";
      const colorScheme = getStatusColorScheme(statusValue);

      return {
        id: status.id,
        title: getShortStatusName(statusValue),
        leads: statusLeads,
        ...colorScheme,
      };
    });
  }, [leads, statuses]);

  const findContainer = (id: string) => {
    if (columns.some((c) => c.id === id)) {
      return id;
    }

   
    for (const column of columns) {
      if (column.leads.find((lead) => lead.leadId === id)) {
        return column.id;
      }
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    setOverId(overId);

   
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

   
    if (activeContainer !== overContainer) {
     
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) return;

   
    if (activeContainer !== overContainer) {
      try {
        await onLeadUpdate(activeId, overContainer);
        toast.success("Lead status updated successfully!");
      } catch (error) {
        toast.error("Failed to update lead status");
        console.error("Error updating lead:", error);
      }
    }
  };

  const activeLead = activeId
    ? leads.find((lead) => lead.leadId === activeId)
    : null;

  return (
    <div className="h-full overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 h-full overflow-x-auto pb-4">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              onLeadClick={onLeadClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeId && activeLead ? (
            <div className="rotate-3 scale-105 shadow-2xl">
              <LeadCard lead={activeLead} onLeadClick={onLeadClick} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

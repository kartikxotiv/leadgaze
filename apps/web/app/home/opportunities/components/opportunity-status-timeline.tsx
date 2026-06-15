'use client';

import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@kit/ui/utils';
import { Button } from '@kit/ui/button';
import { toast } from 'sonner';
import { updateOpportunityService } from '~/services/opportunities.service';

interface Status {
    id: string;
    status_name: string;
    color: string;
    sort_order: number;
}

interface OpportunityStatusTimelineProps {
    opportunityId: string;
    currentStatusId: string;
    statuses: Status[];
    onStatusChange: () => void;
    canEdit: boolean;
}

export function OpportunityStatusTimeline({
    opportunityId,
    currentStatusId,
    statuses,
    onStatusChange,
    canEdit,
}: OpportunityStatusTimelineProps) {
    const currentStatusIndex = statuses.findIndex((s) => s.id === currentStatusId);

    const handleStatusClick = async (statusId: string) => {
        if (!canEdit || statusId === currentStatusId) return;

        try {
            await updateOpportunityService(opportunityId, { stage_id: statusId });
            toast.success('Opportunity stage updated');
            onStatusChange();
        } catch (error) {
            console.error('Update status error:', error);
            toast.error('Failed to update stage');
        }
    };

    return (
        <div className="w-full py-4 overflow-x-auto">
            <div className="flex items-center justify-between w-full px-2">
                {statuses.map((status, index) => {
                    const isCompleted = index < currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;
                    const isLast = index === statuses.length - 1;

                    return (
                        <React.Fragment key={status.id}>
                            <div
                                className={cn(
                                    "group relative flex flex-col items-center gap-2 px-4 transition-all duration-200",
                                    canEdit && !isCurrent ? "cursor-pointer hover:scale-105" : "cursor-default"
                                )}
                                onClick={() => handleStatusClick(status.id)}
                            >
                                {/* Circle */}
                                <div
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                                        isCompleted
                                            ? "bg-primary border-primary text-primary-foreground shadow-md"
                                            : isCurrent
                                                ? "border-primary bg-background text-primary ring-4 ring-primary/10 shadow-lg"
                                                : "border-muted-foreground/30 bg-background text-muted-foreground"
                                    )}
                                    style={isCurrent ? { borderColor: status.color, color: status.color } : isCompleted ? { backgroundColor: status.color, borderColor: status.color } : {}}
                                >
                                    {isCompleted ? (
                                        <Check className="h-4 w-4 stroke-[3px]" />
                                    ) : (
                                        <span className="text-xs font-bold">{index + 1}</span>
                                    )}
                                </div>

                                {/* Label */}
                                <span
                                    className={cn(
                                        "text-[11px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap",
                                        isCurrent
                                            ? "text-primary opacity-100"
                                            : isCompleted
                                                ? "text-muted-foreground opacity-80"
                                                : "text-muted-foreground opacity-50"
                                    )}
                                    style={isCurrent ? { color: status.color } : {}}
                                >
                                    {status.status_name}
                                </span>

                                {/* Tooltip for Current Status */}
                                {isCurrent && (
                                    <div className="absolute -top-1 px-2 py-0.5 bg-primary text-[9px] text-primary-foreground rounded-full font-bold uppercase tracking-tighter">
                                        Status
                                    </div>
                                )}
                            </div>

                            {!isLast && (
                                <div className="flex items-center justify-center text-muted-foreground/30">
                                    <ChevronRight className="h-4 w-4" />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

"use client";
import React, { useCallback, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useDealsByStage, useUpdateDeal } from "@/hooks/use-deals";

type StageKey =
  | "qualification"
  | "proposal"
  | "negotiation"
  | "decision"
  | "closed_won"
  | "closed_lost";

const STAGE_TITLES: Record<StageKey, string> = {
  qualification: "Qualification",
  proposal: "Proposal",
  negotiation: "Negotiation",
  decision: "Decision",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export default function PipelinePage() {
  const { data: dealsByStage = {}, isLoading } = useDealsByStage();
  const updateDeal = useUpdateDeal();
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);

  const stages = useMemo<StageKey[]>(
    () => [
      "qualification",
      "proposal",
      "negotiation",
      "decision",
      "closed_won",
      "closed_lost",
    ],
    []
  );

  const handleDragStart = useCallback((dealId: string) => {
    setDraggingDealId(dealId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (stage: StageKey) => {
      if (!draggingDealId) return;
      let payload: any = { stage };
      if (stage === "closed_lost") {
        const reason = window.prompt("Lost reason (optional):", "");
        if (reason !== null && reason !== undefined) {
          payload.lostReason = reason;
        }
      }
      updateDeal.mutate({ dealId: draggingDealId, data: payload });
      setDraggingDealId(null);
    },
    [draggingDealId, updateDeal]
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(Number.isFinite(value) ? value : 0);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <div className="text-sm text-gray-600">
            {isLoading ? "Loading…" : "Drag a deal to change its stage"}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {stages.map((stageKey) => {
            const list = (dealsByStage as any)[stageKey] || [];
            const totalValue = list.reduce(
              (sum: number, d: any) => sum + parseFloat(String(d.value || 0)),
              0
            );
            return (
              <div
                key={stageKey}
                className="bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col min-h-[60vh]"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stageKey)}
              >
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="font-semibold text-sm">
                    {STAGE_TITLES[stageKey]}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{list.length}</span>
                    <span>•</span>
                    <span>{formatCurrency(totalValue)}</span>
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-auto">
                  {list.map((deal: any) => (
                    <div
                      key={deal.dealId}
                      draggable
                      onDragStart={() => handleDragStart(deal.dealId)}
                      className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow transition-shadow cursor-move"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">
                          {deal.title || "Untitled Deal"}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(parseFloat(String(deal.value || 0)))}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 flex items-center gap-3">
                        <span>Prob: {Number(deal.probability || 0)}%</span>
                        {deal.lead ? (
                          <span className="truncate">
                            {deal.lead.firstName} {deal.lead.lastName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!list.length && (
                    <div className="text-xs text-gray-500 text-center py-6">
                      No deals
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

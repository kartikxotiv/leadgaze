"use client";

import { useState, useEffect } from "react";
import type { Deal, PipelineStage } from "@/lib/types";

const mockStages: PipelineStage[] = [
  {
    id: "stage-1",
    name: "Prospecting",
    position: 1,
    color: "#3b82f6",
    description: "Initial contact and qualification",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "stage-2",
    name: "Qualification",
    position: 2,
    color: "#f59e0b",
    description: "Qualifying the opportunity",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "stage-3",
    name: "Proposal",
    position: 3,
    color: "#8b5cf6",
    description: "Proposal sent and under review",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "stage-4",
    name: "Negotiation",
    position: 4,
    color: "#ef4444",
    description: "Negotiating terms and pricing",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "stage-5",
    name: "Closed Won",
    position: 5,
    color: "#10b981",
    description: "Deal successfully closed",
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
  },
];

const mockDeals: Deal[] = [
  {
    id: "deal-1",
    lead_id: "2",
    stage_id: "stage-2",
    value: 75000,
    probability: 60,
    expected_close_date: "2024-02-15T00:00:00Z",
    actual_close_date: undefined,
    notes: "Strong interest, waiting for budget approval",
    assigned_to: "user-2",
    created_at: "2024-01-14T14:30:00Z",
    updated_at: "2024-01-17T09:15:00Z",
  },
  {
    id: "deal-2",
    lead_id: "4",
    stage_id: "stage-5",
    value: 100000,
    probability: 100,
    expected_close_date: "2024-01-18T00:00:00Z",
    actual_close_date: "2024-01-18T15:30:00Z",
    notes: "Deal closed successfully",
    assigned_to: "user-1",
    created_at: "2024-01-10T08:00:00Z",
    updated_at: "2024-01-18T15:30:00Z",
  },
  {
    id: "deal-3",
    lead_id: "1",
    stage_id: "stage-1",
    value: 50000,
    probability: 25,
    expected_close_date: "2024-03-01T00:00:00Z",
    actual_close_date: undefined,
    notes: "Initial discussions ongoing",
    assigned_to: "user-1",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
];

export function usePipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedDeals = localStorage.getItem("crm-deals");
      const savedStages = localStorage.getItem("crm-stages");

      if (savedDeals) {
        setDeals(JSON.parse(savedDeals));
      } else {
        setDeals(mockDeals);
        localStorage.setItem("crm-deals", JSON.stringify(mockDeals));
      }

      if (savedStages) {
        setStages(JSON.parse(savedStages));
      } else {
        setStages(mockStages);
        localStorage.setItem("crm-stages", JSON.stringify(mockStages));
      }
    } catch (err) {
      console.error("Error loading pipeline data:", err);
      setDeals(mockDeals);
      setStages(mockStages);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced localStorage saves to improve performance
  useEffect(() => {
    if (deals.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("crm-deals", JSON.stringify(deals));
      }, 500); // 500ms debounce
      return () => clearTimeout(timeoutId);
    }
  }, [deals]);

  useEffect(() => {
    if (stages.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("crm-stages", JSON.stringify(stages));
      }, 500); // 500ms debounce
      return () => clearTimeout(timeoutId);
    }
  }, [stages]);

  const addDeal = async (dealData: Partial<Deal>) => {
    try {
      setLoading(true);
      const newDeal: Deal = {
        id: `deal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        lead_id: dealData.lead_id,
        stage_id: dealData.stage_id || "stage-1",
        value: dealData.value || 0,
        probability: dealData.probability || 25,
        expected_close_date: dealData.expected_close_date,
        actual_close_date: dealData.actual_close_date,
        notes: dealData.notes || "",
        assigned_to: dealData.assigned_to,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setDeals((prev) => [newDeal, ...prev]);
      return newDeal;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add deal");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateDeal = async (id: string, updates: Partial<Deal>) => {
    try {
      setLoading(true);
      setDeals((prev) =>
        prev.map((deal) =>
          deal.id === id
            ? { ...deal, ...updates, updated_at: new Date().toISOString() }
            : deal
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update deal");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const moveDeal = async (dealId: string, newStageId: string) => {
    await updateDeal(dealId, { stage_id: newStageId });
  };

  const getDealsByStage = (stageId: string) => {
    return deals.filter((deal) => deal.stage_id === stageId);
  };

  const deleteDeal = async (id: string) => {
    try {
      setLoading(true);
      setDeals((prev) => prev.filter((deal) => deal.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deal");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTotalPipelineValue = () => {
    return deals.reduce((total, deal) => total + deal.value, 0);
  };

  const getWeightedPipelineValue = () => {
    return deals.reduce(
      (total, deal) => total + (deal.value * deal.probability) / 100,
      0
    );
  };

  return {
    deals,
    stages,
    loading,
    error,
    addDeal,
    updateDeal,
    deleteDeal,
    moveDeal,
    getDealsByStage,
    getTotalPipelineValue,
    getWeightedPipelineValue,
  };
}

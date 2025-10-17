"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FollowUpDashboard } from "@/components/tasks/follow-up-dashboard";

export default function TasksPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Tasks & Follow-ups
            </h1>
            <p className="text-muted-foreground mt-2 text-sm" >
              Stay on top of your pipeline with smart follow-up management
            </p>
          </div>
        </div>

        {/* Follow-up Dashboard */}
        <FollowUpDashboard />
      </div>
    </DashboardLayout>
  );
}

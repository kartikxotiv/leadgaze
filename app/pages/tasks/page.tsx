"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FollowUpDashboard } from "@/components/tasks/follow-up-dashboard";

export default function TasksPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FollowUpDashboard />
        adasd
      </div>
    </DashboardLayout>
  );
}

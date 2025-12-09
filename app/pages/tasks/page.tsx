"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { UnifiedTasksList } from "@/components/tasks/unified-tasks-list";

export default function TasksPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <UnifiedTasksList />
      </div>
    </DashboardLayout>
  );
}

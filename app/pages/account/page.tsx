"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import AddBusiness from "@/components/business/add-business";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AccountPage() {
  const [addBusinessOpen, setAddBusinessOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Account</h1>
          </div>
          <div>
            <Button variant="outline" onClick={() => setAddBusinessOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Business
            </Button>
          </div>
        </div>

        <AddBusiness open={addBusinessOpen} onOpenChange={setAddBusinessOpen} />
      </div>
    </DashboardLayout>
  );
}

/**
 * Example of how to integrate the modern leads UI into the existing leads page
 * Replace the existing table view with this cleaner, card-based design
 */

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeadsPageModern } from "./leads-page-modern";

interface LeadsIntegrationExampleProps {
  leads: any[]; // Your existing leads data
  onRefresh?: () => void;
}

export function LeadsIntegrationExample({
  leads,
  onRefresh,
}: LeadsIntegrationExampleProps) {
  const router = useRouter();

  const handleLeadClick = (leadId: string) => {
    router.push(`/pages/leads/${leadId}`);
  };

  const handleCallLead = (lead: any) => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, "_self");
      // Log call activity automatically
      // You can call your existing activity logging function here
      toast.success(`Calling ${lead.firstName} ${lead.lastName}`);
    } else {
      toast.error("No phone number available");
    }
  };

  const handleEmailLead = (lead: any) => {
    if (lead.email) {
      window.open(`mailto:${lead.email}`, "_self");
      // Log email activity automatically
      toast.success(`Opening email to ${lead.firstName} ${lead.lastName}`);
    }
  };

  const handleActivityLog = (lead: any) => {
    // Open your existing activity log modal/dialog
    // You can use your existing activity logging function here
    console.log("Log activity for:", lead);
    toast.info("Activity logging feature - integrate with your existing modal");
  };

  const handleScheduleFollowup = (lead: any) => {
    // Open your existing follow-up scheduler
    // You can use your existing follow-up scheduling function here
    console.log("Schedule follow-up for:", lead);
    toast.info("Follow-up scheduling - integrate with your existing scheduler");
  };

  const handleAddLead = () => {
    router.push("/pages/leads/new");
  };

  const handleBulkImport = () => {
    // Open your existing bulk import dialog
    console.log("Open bulk import");
    toast.info("Bulk import feature - integrate with your existing dialog");
  };

  return (
    <LeadsPageModern
      leads={leads}
      onLeadClick={handleLeadClick}
      onCallLead={handleCallLead}
      onEmailLead={handleEmailLead}
      onActivityLog={handleActivityLog}
      onScheduleFollowup={handleScheduleFollowup}
      onAddLead={handleAddLead}
      onBulkImport={handleBulkImport}
    />
  );
}

/**
 * Integration Steps:
 *
 * 1. Replace the existing table view in app/pages/leads/page.tsx
 * 2. Import this component instead of the current table
 * 3. Connect your existing hooks and functions:
 *    - useLeads() for data
 *    - useUpdateLead() for updates
 *    - Activity logging modal
 *    - Follow-up scheduler
 *    - Bulk import dialog
 *
 * Example replacement:
 *
 * // OLD (in app/pages/leads/page.tsx):
 * <Table>
 *   <TableHeader>...</TableHeader>
 *   <TableBody>...</TableBody>
 * </Table>
 *
 * // NEW:
 * <LeadsIntegrationExample
 *   leads={safeLeads}
 *   onRefresh={refetch}
 * />
 */

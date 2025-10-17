

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeadsPageModern } from "./leads-page-modern";

interface LeadsIntegrationExampleProps {
  leads: any[];
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
     
     
      toast.success(`Calling ${lead.firstName} ${lead.lastName}`);
    } else {
      toast.error("No phone number available");
    }
  };

  const handleEmailLead = (lead: any) => {
    if (lead.email) {
      window.open(`mailto:${lead.email}`, "_self");
     
      toast.success(`Opening email to ${lead.firstName} ${lead.lastName}`);
    }
  };

  const handleActivityLog = (lead: any) => {
   
   
    console.log("Log activity for:", lead);
    toast.info("Activity logging feature - integrate with your existing modal");
  };

  const handleScheduleFollowup = (lead: any) => {
   
   
    console.log("Schedule follow-up for:", lead);
    toast.info("Follow-up scheduling - integrate with your existing scheduler");
  };

  const handleAddLead = () => {
    router.push("/pages/leads/new");
  };

  const handleBulkImport = () => {
   
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



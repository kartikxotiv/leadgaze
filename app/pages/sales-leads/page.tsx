"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useSalesLeadsPage } from "@/hooks/use-sales-leads-page";
import { SalesLeadsPageContainer } from "@/components/sales-leads/sales-leads-page-container";

export default function SalesLeadsPage() {
  const pageHook = useSalesLeadsPage();

  return (
    <DashboardLayout>
      <SalesLeadsPageContainer pageHook={pageHook} />
    </DashboardLayout>
  );
}

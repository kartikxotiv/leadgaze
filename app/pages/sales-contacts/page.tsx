"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useSalesContactsPage } from "@/hooks/use-sales-contacts-page";
import { SalesContactsPageContainer } from "@/components/sales-contacts/sales-contacts-page-container";

export default function SalesContactsPage() {
  const pageHook = useSalesContactsPage();

  return (
    <DashboardLayout>
      <SalesContactsPageContainer pageHook={pageHook} />
    </DashboardLayout>
  );
}

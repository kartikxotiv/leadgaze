"use client";
import { SalesContactsPageContainer } from "@/components/contacts/sales-contacts-page-container";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useSalesContactsPage } from "@/hooks/use-sales-contacts-page";

export default function SalesContactsPage() {
  const pageHook = useSalesContactsPage();

  return (
    <DashboardLayout>
      <SalesContactsPageContainer pageHook={pageHook} />
    </DashboardLayout>
  );
}

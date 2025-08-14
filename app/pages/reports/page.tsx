"use client";
import React, { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useDealStats, useDeals } from "@/hooks/use-deals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const { data: stats } = useDealStats();
  const { data } = useDeals({ limit: 1000 });
  const deals = data?.deals || [];

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
    }).format(Number.isFinite(n) ? n : 0);

  const csv = useMemo(() => {
    const header = [
      "dealId",
      "title",
      "value",
      "probability",
      "stage",
      "leadName",
      "createdAt",
    ];
    const rows = deals.map((d: any) => [
      d.dealId,
      JSON.stringify(d.title || ""),
      d.value,
      d.probability,
      d.stage,
      JSON.stringify(d.lead ? `${d.lead.firstName} ${d.lead.lastName}` : ""),
      d.createdAt,
    ]);
    return [header, ...rows].map((r) => r.join(",")).join("\n");
  }, [deals]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deals.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Reports</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Deals</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {stats?.total ?? 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Value</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatCurrency(stats?.totalValue ?? 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Weighted Forecast</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatCurrency(stats?.weightedForecast ?? 0)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Win Rate</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {Math.round((stats?.winRate ?? 0) * 10) / 10}%
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deals (up to 1000)</h2>
          <Button size="sm" onClick={downloadCsv}>
            Export CSV
          </Button>
        </div>

        <div className="overflow-auto rounded-md border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="text-left p-2">Title</th>
                <th className="text-right p-2">Value</th>
                <th className="text-right p-2">Prob%</th>
                <th className="text-left p-2">Stage</th>
                <th className="text-left p-2">Lead</th>
                <th className="text-left p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d: any) => (
                <tr
                  key={d.dealId}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <td className="p-2">{d.title}</td>
                  <td className="p-2 text-right">
                    {formatCurrency(parseFloat(String(d.value || 0)))}
                  </td>
                  <td className="p-2 text-right">{d.probability}</td>
                  <td className="p-2">{d.stage}</td>
                  <td className="p-2">
                    {d.lead ? `${d.lead.firstName} ${d.lead.lastName}` : ""}
                  </td>
                  <td className="p-2">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {!deals.length && (
                <tr>
                  <td className="p-2 text-sm text-gray-600" colSpan={6}>
                    No deals
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

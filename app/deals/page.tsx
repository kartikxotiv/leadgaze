"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import dynamic from "next/dynamic";

// Dynamic import for heavy DealsPipeline
const DealsPipeline = dynamic(
  () =>
    import("@/components/deals/deals-pipeline").then((mod) => ({
      default: mod.DealsPipeline,
    })),
  {
    loading: () => (
      <div className="animate-pulse h-96 bg-gray-100 rounded-lg" />
    ),
    ssr: false,
  }
);
import { useDealStats } from "@/hooks/use-deals";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  TrendingUp,
  DollarSign,
  Target,
  Award,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function DealsPage() {
  const [activeTab, setActiveTab] = useState("pipeline");
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useDealStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/pages/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Deals</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {/* Sales Pipeline  */}
              Deals
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your deals and track revenue opportunities
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : statsError ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Failed to load statistics
                </p>
              </div>
            </CardContent>
          </Card>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Pipeline Value
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(stats.totalValue)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Avg: {formatCurrency(stats.avgValue)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Deals
                    </p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs bg-green-50 text-green-700 border-green-200"
                  >
                    +{stats.wonDeals} won
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs bg-red-50 text-red-700 border-red-200"
                  >
                    -{stats.lostDeals} lost
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Win Rate
                    </p>
                    <p className="text-2xl font-bold">
                      {formatPercentage(stats.winRate)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center">
                    <Award className="h-4 w-4 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Based on closed deals
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Forecast Revenue
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(stats.weightedForecast || 0)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-orange-100 dark:bg-orange-950 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Weighted probability
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        
        






          <div className="md:w-1/2 w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pipeline" className="flex items-center gap-2 py-4">
                  <Target className="h-4 w-4" />
                  Kanban View
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 py-4">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2 py-4">
                  <PieChart className="h-4 w-4" />
                  Reports
                </TabsTrigger>
              </TabsList>
          </div>
















          <TabsContent value="pipeline" className="mt-6">
            <DealsPipeline />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Deals by Stage
                  </CardTitle>
                  <CardDescription>
                    Distribution of deals across pipeline stages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {stats && (
                    <div className="space-y-3">
                      {Object.entries(stats.byStage).map(([stage, count]) => (
                        <div
                          key={stage}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm font-medium capitalize">
                              {stage.replace("_", " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              {count as number} deals
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(stats.valueByStage[stage] || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium">
                        Conversion Rate
                      </span>
                      <span className="text-sm font-bold">
                        {stats ? formatPercentage(stats.winRate) : "0%"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium">
                        Average Deal Size
                      </span>
                      <span className="text-sm font-bold">
                        {stats ? formatCurrency(stats.avgValue) : "$0"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <span className="text-sm font-medium">Total Revenue</span>
                      <span className="text-sm font-bold">
                        {stats
                          ? formatCurrency(stats.valueByStage.closed_won || 0)
                          : "$0"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Sales Reports
                </CardTitle>
                <CardDescription>
                  Detailed sales performance reports and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Reports Coming Soon
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Advanced reporting features including charts, forecasting,
                    and detailed analytics will be available here.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Revenue forecasting</p>
                    <p>• Team performance metrics</p>
                    <p>• Pipeline velocity analysis</p>
                    <p>• Custom report builder</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

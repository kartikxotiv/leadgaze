"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { usePreventAuthBack } from "@/hooks/use-prevent-auth-back";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  User,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Activity,
  Calendar,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  BarChart3,
  PieChart,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Filter,
  Download,
  RefreshCw,
  Bell,
  Settings,
} from "lucide-react";
import { Suspense, useState, useMemo } from "react";
import { useDashboardStats, useRecentActivities } from "@/hooks/use-dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

export default function DashboardPage() {
 
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");
  const [isRefreshing, setIsRefreshing] = useState(false);

 
 
  const { user, currentOrganization } = useAuth();
  const { data: stats, isLoading: statsLoading } =
    useDashboardStats(selectedTimeRange);
  const { data: activities, isLoading: activitiesLoading } =
    useRecentActivities(6);

 
  usePreventAuthBack();

 
  const COLORS = {
    primary: "#3b82f6",
    secondary: "#10b981",
    accent: "#8b5cf6",
    warning: "#f59e0b",
    danger: "#ef4444",
    muted: "#6b7280",
  };

 
  const pipelineData = useMemo(() => {
    if (!stats?.byStage) return [];
    return [
      {
        stage: "Qualification",
        count: stats.byStage.qualification,
        color: COLORS.primary,
      },
      {
        stage: "Proposal",
        count: stats.byStage.proposal,
        color: COLORS.secondary,
      },
      {
        stage: "Negotiation",
        count: stats.byStage.negotiation,
        color: COLORS.accent,
      },
      {
        stage: "Decision",
        count: stats.byStage.decision,
        color: COLORS.warning,
      },
      {
        stage: "Won",
        count: stats.byStage.closed_won,
        color: COLORS.secondary,
      },
      { stage: "Lost", count: stats.byStage.closed_lost, color: COLORS.danger },
    ];
  }, [stats]);

 
  const trendData = stats?.trendData || [
    { month: "Jan", leads: 45, deals: 12, revenue: 24000 },
    { month: "Feb", leads: 52, deals: 18, revenue: 32000 },
    { month: "Mar", leads: 48, deals: 15, revenue: 28000 },
    { month: "Apr", leads: 61, deals: 22, revenue: 45000 },
    { month: "May", leads: 55, deals: 19, revenue: 38000 },
    { month: "Jun", leads: 67, deals: 25, revenue: 52000 },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
   
    try {
     
      window.location.reload();
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

 
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Good{" "}
                  {new Date().getHours() < 12
                    ? "morning"
                    : new Date().getHours() < 17
                    ? "afternoon"
                    : "evening"}
                  , {user?.firstName}!
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
                  Here's your business overview at a glance
                </p>
              </div>
              <div className="flex items-center gap-3">
                {}
                <Badge
                  variant="secondary"
                  className="bg-gray-100 text-gray-700"
                >
                  {currentOrganization?.name}
                </Badge>
              </div>
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-indigo-600/10 rounded-full blur-2xl"></div>
        </div>

        {}
        {}

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">
                    Total Leads
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {statsLoading ? "--" : stats?.totalLeads ?? 0}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-blue-200">
                      {selectedTimeRange} period
                    </span>
                  </div>
                </div>
                <Target className="h-8 w-8 text-white/80" />
              </div>
            </CardContent>
          </Card>

          {}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">
                    Pipeline Value
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {statsLoading
                      ? "--"
                      : formatCurrency(stats?.totalPipelineValue || 0)}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-emerald-200">
                      Active opportunities
                    </span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-white/80" />
              </div>
            </CardContent>
          </Card>

          {}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    Active Deals
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {statsLoading ? "--" : stats?.totalDeals ?? 0}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-purple-200">In pipeline</span>
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-white/80" />
              </div>
            </CardContent>
          </Card>

          {}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">
                    Win Rate
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {statsLoading ? "--" : `${stats?.winRate ?? 0}%`}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-orange-200">
                      Closed deals
                    </span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-white/80" />
              </div>
            </CardContent>
          </Card>

          {}
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">
                    Conversion
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {statsLoading ? "--" : `${stats?.conversionRate ?? 0}%`}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-indigo-200">
                      Lead to deal
                    </span>
                  </div>
                </div>
                <Zap className="h-8 w-8 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {}
          <Card className="shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Pipeline Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Deals by stage across your pipeline
                </p>
              </div>
              <PieChart className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border rounded shadow">
                              <p className="font-medium">{label}</p>
                              <p className="text-sm text-muted-foreground">
                                {payload[0].value} deals
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {pipelineData.map((stage, index) => (
                  <div key={stage.stage} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {stage.stage}: {stage.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {}
          <Card className="shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">
                  Performance Trends
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Leads and deals over time
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border rounded shadow">
                              <p className="font-medium mb-2">{label}</p>
                              {payload.map((entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-sm capitalize">
                                    {entry.dataKey}: {entry.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      stackId="1"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="deals"
                      stackId="1"
                      stroke={COLORS.secondary}
                      fill={COLORS.secondary}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {}
          <Card className="lg:col-span-3 shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Recent Activities
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Latest updates and interactions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/activities">
                    View All
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : activities && activities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activities
                    .slice(0, 6)
                    .map((activity: any, index: number) => (
                      <div
                        key={activity.activityId || index}
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all duration-200"
                      >
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {activity.activityType === "call" && (
                            <Phone className="h-4 w-4 text-blue-600" />
                          )}
                          {activity.activityType === "email" && (
                            <Mail className="h-4 w-4 text-green-600" />
                          )}
                          {activity.activityType === "meeting" && (
                            <Calendar className="h-4 w-4 text-purple-600" />
                          )}
                          {!["call", "email", "meeting"].includes(
                            activity.activityType
                          ) && <Activity className="h-4 w-4 text-gray-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {activity.subject || "No subject"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="text-xs capitalize"
                            >
                              {activity.activityType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                activity.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No recent activities
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding leads or creating deals
                  </p>
                  <Button asChild>
                    <Link href="/pages/leads/new">Add Your First Lead</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                asChild
                className="w-full justify-start bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg"
              >
                <Link href="/pages/leads/new">
                  <Target className="h-4 w-4 mr-2" />
                  Add Lead
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start hover:bg-green-50 hover:border-green-200 hover:text-green-700"
              >
                <Link href="/deals">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Pipeline
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
              >
                <Link href="/tasks">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Tasks
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700"
              >
                <Link href="/pages/team">
                  <Users className="h-4 w-4 mr-2" />
                  Team
                </Link>
              </Button>
              <hr className="my-3" />
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:bg-gray-50"
              >
                <Link href="/reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reports
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:bg-gray-50"
              >
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

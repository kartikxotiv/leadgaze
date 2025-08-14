"use client";

import { DashboardLayout } from "../../components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { useLeads } from "../../hooks/use-leads";
import { useTasks } from "../../hooks/use-tasks";
import { usePipeline } from "../../hooks/use-pipeline";
import {
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  DollarSign,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { Deal } from "../../lib/types";

export default function ReportsPage() {
  const { leads, getLeadsByStatus } = useLeads();
  const { tasks } = useTasks();
  const { deals, stages } = usePipeline();

  const getDealStatus = (deal: Deal) => {
    const stage = stages.find((s) => s.id === deal.stage_id);
    if (!stage) return "Unknown";

    // Map stage names to simple status
    if (
      stage.name.toLowerCase().includes("closed won") ||
      stage.name.toLowerCase().includes("won")
    ) {
      return "Won";
    }
    if (
      stage.name.toLowerCase().includes("closed lost") ||
      stage.name.toLowerCase().includes("lost")
    ) {
      return "Lost";
    }
    return "Open";
  };

  const totalLeads = leads.length;
  const qualifiedLeads = getLeadsByStatus("Qualified").length;
  const conversionRate =
    totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

  const totalDeals = deals.length;
  const wonDeals = deals.filter((d) => getDealStatus(d) === "Won").length;
  const winRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const taskCompletionRate =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalRevenue = deals
    .filter((d) => getDealStatus(d) === "Won")
    .reduce((sum, deal) => sum + deal.value, 0);

  return (
    <DashboardLayout
      title="Reports & Analytics"
      description="Comprehensive insights into your sales performance and metrics"
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">From closed deals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Deals closed won</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Lead Conversion
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Leads to qualified
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Task Completion
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {taskCompletionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Tasks completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Lead Status Breakdown</CardTitle>
              <CardDescription>
                Distribution of leads by current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  "New",
                  "Qualified",
                  "In Progress",
                  "Converted",
                  "Disqualified",
                ].map((status) => {
                  const count = getLeadsByStatus(status).length;
                  const percentage =
                    totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            status === "Converted"
                              ? "default"
                              : status === "Disqualified"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {status}
                        </Badge>
                        <span className="text-sm">{count} leads</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {percentage.toFixed(1)}%
                        </div>
                        <Progress value={percentage} className="w-16 h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deal Status Overview</CardTitle>
              <CardDescription>
                Current state of all deals in pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["Won", "Lost", "Open"].map((status) => {
                  const count = deals.filter(
                    (d) => getDealStatus(d) === status
                  ).length;
                  const value = deals
                    .filter((d) => getDealStatus(d) === status)
                    .reduce((sum, deal) => sum + deal.value, 0);
                  const percentage =
                    totalDeals > 0 ? (count / totalDeals) * 100 : 0;
                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            status === "Won"
                              ? "default"
                              : status === "Lost"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {status}
                        </Badge>
                        <span className="text-sm">{count} deals</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${value.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stage Analysis</CardTitle>
            <CardDescription>
              Performance metrics by pipeline stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stages.map((stage) => {
                const stageDeals = deals.filter(
                  (deal) => deal.stage_id === stage.id
                );
                const stageValue = stageDeals.reduce(
                  (sum, deal) => sum + deal.value,
                  0
                );
                const stagePercentage =
                  totalDeals > 0 ? (stageDeals.length / totalDeals) * 100 : 0;

                return (
                  <div
                    key={stage.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <div>
                        <div className="font-medium">{stage.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {stage.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {stageDeals.length} deals
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${stageValue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stagePercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
            <CardDescription>
              Recent performance across all areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {totalLeads}
                </div>
                <div className="text-sm text-muted-foreground">Total Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {wonDeals}
                </div>
                <div className="text-sm text-muted-foreground">Deals Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {completedTasks}
                </div>
                <div className="text-sm text-muted-foreground">
                  Tasks Completed
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

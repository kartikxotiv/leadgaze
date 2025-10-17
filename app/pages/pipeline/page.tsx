"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Target,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Plus,
  Filter,
  Download,
} from "lucide-react";

export default function PipelinePage() {
  const pipelineStages = [
    { name: "Qualification", deals: 12, value: 240000, color: "bg-blue-500" },
    { name: "Proposal", deals: 8, value: 180000, color: "bg-green-500" },
    { name: "Negotiation", deals: 5, value: 120000, color: "bg-yellow-500" },
    { name: "Decision", deals: 3, value: 75000, color: "bg-orange-500" },
    { name: "Closed Won", deals: 15, value: 450000, color: "bg-emerald-500" },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
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
              <BreadcrumbPage>Pipeline</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Pipeline</h1>
            <p className="text-muted-foreground mt-2">
              Track deals through your sales process
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Pipeline Value
                  </p>
                  <p className="text-2xl font-bold">{formatCurrency(615000)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
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
                  <p className="text-2xl font-bold">28</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
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
                  <p className="text-2xl font-bold">65%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Stages */}



        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
          <div className="col-span-1">
          
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Pipeline Stages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {pipelineStages.map((stage, index) => (
                <div key={stage.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                      <span className="font-medium">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {stage.deals} deals
                      </span>
                      <span className="font-medium">
                        {formatCurrency(stage.value)}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(stage.deals / 20) * 100}
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
        <div className="col-span-1">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Pipeline Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">ACME Corp Deal</p>
                  <p className="text-sm text-muted-foreground">
                    Moved to Proposal stage
                  </p>
                </div>
                <Badge variant="secondary">2 hours ago</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Tech Solutions</p>
                  <p className="text-sm text-muted-foreground">
                    Deal closed won - $50,000
                  </p>
                </div>
                <Badge variant="secondary">1 day ago</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Global Industries</p>
                  <p className="text-sm text-muted-foreground">
                    New deal added to Qualification
                  </p>
                </div>
                <Badge variant="secondary">3 days ago</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
        </div>



      </div>
    </DashboardLayout>
  );
}
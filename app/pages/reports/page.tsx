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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Eye,
  FileText,
} from "lucide-react";

export default function ReportsPage() {
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
              <BreadcrumbPage>Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Comprehensive insights into your business performance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Report Categories */}
        <Tabs defaultValue="sales" className="w-full">
         

          <div className="lg:w-1/3 md:w-1/2 w-full">
          
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales" className="flex items-center gap-2 py-3">
              <BarChart3 className="h-4 w-4" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2 py-3">
              <TrendingUp className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2 py-3">
              <PieChart className="h-4 w-4" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-2 py-3">
              <FileText className="h-4 w-4" />
              Custom
            </TabsTrigger>
          </TabsList>

          </div>




          <TabsContent value="sales" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[18px]">
                    <BarChart3 className="h-4 w-4" />
                    Sales Performance
                  </CardTitle>
                </CardHeader>


                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Total Revenue</span>
                      <span className="text-[14px] font-medium">$450,000</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Deals Closed</span>
                      <span className="text-[14px] font-medium">23</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Average Deal Size</span>
                      <span className="text-[14px] font-medium">$19,565</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[18px]">
                    <TrendingUp className="h-4 w-4" />
                    Revenue Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">This Month</span>
                      <Badge variant="secondary">+12%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Month</span>
                      <Badge variant="secondary">+8%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Quarter</span>
                      <Badge variant="secondary">+15%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[18px]">
                    <TrendingUp className="h-5 w-5" />
                    Lead Generation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Total Leads</span>
                      <span className="text-lg font-medium text-[14px]">1,247</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Qualified Leads</span>
                      <span className="text-lg font-medium text-[14px]" >312</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Conversion Rate</span>
                      <span className="text-lg font-medium text-[14px]">25%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[18px]">
                    <Eye className="h-5 w-5" />
                    Lead Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Website</span>
                      <Badge variant="secondary" className="font-[14px]">45%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Social Media</span>
                      <Badge variant="secondary" className="font-[14px]">30%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Referrals</span>
                      <Badge variant="secondary" className="font-[14px]">15%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Other</span>
                      <Badge variant="secondary" className="font-[14px]">10%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="marketing" className="space-y-6 mt-6" >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[18px]">
                  <PieChart className="h-5 w-5" />
                  Marketing Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Marketing Analytics Coming Soon
                  </h3>
                  <p className="text-muted-foreground">
                    Advanced marketing reports and campaign analytics will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[18px]">
                  <FileText className="h-5 w-5" />
                  Custom Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Custom Report Builder
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create custom reports with drag-and-drop functionality.
                  </p>
                  <Button>Create Custom Report</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Plus,
  Grid3X3,
  List,
  Upload,
  Download,
  Users,
  TrendingUp,
  Star,
  Clock,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadCard } from "./lead-card";

interface Lead {
  leadId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName?: string;
  linkedinProfile?: string;
  status: {
    entityValue: string;
    description: string;
  };
  source: {
    entityValue: string;
    description: string;
  };
  industry?: {
    entityValue: string;
    description: string;
  };
  scoreData?: {
    totalScore: number;
    tier: string;
  };
  leadScore?: number;
  createdAt: string;
  updatedAt: string;
  lastContactDate?: string;
}

interface LeadsPageModernProps {
  leads: Lead[];
  isLoading?: boolean;
  onLeadClick?: (leadId: string) => void;
  onCallLead?: (lead: Lead) => void;
  onEmailLead?: (lead: Lead) => void;
  onActivityLog?: (lead: Lead) => void;
  onScheduleFollowup?: (lead: Lead) => void;
  onAddLead?: () => void;
  onBulkImport?: () => void;
}

export function LeadsPageModern({
  leads,
  isLoading = false,
  onLeadClick,
  onCallLead,
  onEmailLead,
  onActivityLog,
  onScheduleFollowup,
  onAddLead,
  onBulkImport,
}: LeadsPageModernProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("updated");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      `${lead.firstName} ${lead.lastName} ${lead.email} ${lead.businessName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || lead.status?.entityValue === statusFilter;

    const matchesSource =
      sourceFilter === "all" || lead.source?.entityValue === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return (
          (b.scoreData?.totalScore || b.leadScore || 0) -
          (a.scoreData?.totalScore || a.leadScore || 0)
        );
      case "name":
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        );
      case "created":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "updated":
      default:
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
  });

  const uniqueStatuses = Array.from(
    new Set(leads.map((lead) => lead.status?.entityValue).filter(Boolean))
  );

  const uniqueSources = Array.from(
    new Set(leads.map((lead) => lead.source?.entityValue).filter(Boolean))
  );

 
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(
    (lead) => lead.status?.entityValue === "qualified"
  ).length;
  const highScoreLeads = leads.filter(
    (lead) => (lead.scoreData?.totalScore || lead.leadScore || 0) >= 60
  ).length;
  const recentLeads = leads.filter((lead) => {
    const daysDiff =
      (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
  }).length;

  return (
    <div className="space-y-6">
      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Leads
                </p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              +{recentLeads} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Qualified
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {qualifiedLeads}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalLeads > 0
                ? Math.round((qualifiedLeads / totalLeads) * 100)
                : 0}
              % conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  High Score
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {highScoreLeads}
                </p>
              </div>
              <Star className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              60+ score leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Recent
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {recentLeads}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Leads</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your prospects and track their journey
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onBulkImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button onClick={onAddLead}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {uniqueSources.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Recent</SelectItem>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="h-7 w-7 p-0"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-7 w-7 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredLeads.length} of {leads.length} leads
            </span>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                Results for "{searchTerm}"
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "gap-4",
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid grid-cols-1 lg:grid-cols-2 gap-3"
          )}
        >
          {sortedLeads.map((lead) => (
            <LeadCard
              key={lead.leadId}
              lead={lead}
              onLeadClick={onLeadClick}
              onCallLead={onCallLead}
              onEmailLead={onEmailLead}
              onActivityLog={onActivityLog}
              onScheduleFollowup={onScheduleFollowup}
              compact={viewMode === "list"}
            />
          ))}
        </div>
      )}

      {}
      {!isLoading && sortedLeads.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Users className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? "No leads found" : "No leads yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm
                ? `No leads match your search for "${searchTerm}". Try adjusting your filters.`
                : "Get started by adding your first lead or importing leads from a CSV file."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={onAddLead}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
              <Button variant="outline" onClick={onBulkImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import Leads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

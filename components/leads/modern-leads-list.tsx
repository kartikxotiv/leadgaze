"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Mail,
  Building2,
  MoreVertical,
  Edit,
  Calendar,
  Activity,
  Clock,
  Star,
  MapPin,
  LinkedinIcon,
  Search,
  Filter,
  Plus,
  Grid3X3,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ModernLeadsListProps {
  leads: Lead[];
  onLeadClick?: (leadId: string) => void;
  onStatusUpdate?: (leadId: string, status: string) => void;
  onCallLead?: (lead: Lead) => void;
  onEmailLead?: (lead: Lead) => void;
  onActivityLog?: (lead: Lead) => void;
  onScheduleFollowup?: (lead: Lead) => void;
}

export function ModernLeadsList({
  leads,
  onLeadClick,
  onStatusUpdate,
  onCallLead,
  onEmailLead,
  onActivityLog,
  onScheduleFollowup,
}: ModernLeadsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      `${lead.firstName} ${lead.lastName} ${lead.email} ${lead.businessName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || lead.status?.entityValue === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800 border-blue-200",
      contact_attempted: "bg-yellow-100 text-yellow-800 border-yellow-200",
      in_conversation: "bg-green-100 text-green-800 border-green-200",
      qualified: "bg-purple-100 text-purple-800 border-purple-200",
      disqualified: "bg-red-100 text-red-800 border-red-200",
      not_reachable: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getScoreTier = (score: number, tier?: string) => {
    if (tier) {
      const tiers: Record<string, { color: string; icon: string }> = {
        burning: { color: "text-red-600", icon: "🔥" },
        hot: { color: "text-orange-600", icon: "🌶️" },
        warm: { color: "text-yellow-600", icon: "🟡" },
        cold: { color: "text-blue-600", icon: "🧊" },
      };
      return tiers[tier] || { color: "text-gray-600", icon: "⭐" };
    }

    if (score >= 60) return { color: "text-red-600", icon: "🔥" };
    if (score >= 40) return { color: "text-orange-600", icon: "🌶️" };
    if (score >= 20) return { color: "text-yellow-600", icon: "🟡" };
    return { color: "text-blue-600", icon: "🧊" };
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const uniqueStatuses = Array.from(
    new Set(leads.map((lead) => lead.status?.entityValue).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredLeads.length} of {leads.length} leads
        </span>
        <span>{searchTerm && `Results for "${searchTerm}"`}</span>
      </div>

      {/* Leads Grid/List */}
      <div
        className={cn(
          "gap-6",
          viewMode === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "flex flex-col space-y-4"
        )}
      >
        {filteredLeads.map((lead) => {
          const score = lead.scoreData?.totalScore || lead.leadScore || 0;
          const scoreTier = getScoreTier(score, lead.scoreData?.tier);

          return (
            <Card
              key={lead.leadId}
              className={cn(
                "group hover:shadow-lg transition-all duration-200 cursor-pointer",
                viewMode === "list" && "flex-row"
              )}
              onClick={() => onLeadClick?.(lead.leadId)}
            >
              <CardContent
                className={cn(
                  "p-6",
                  viewMode === "list" &&
                    "flex items-center justify-between w-full"
                )}
              >
                <div
                  className={cn(
                    "space-y-4",
                    viewMode === "list" && "flex items-center gap-6 flex-1"
                  )}
                >
                  {/* Header */}
                  <div
                    className={cn(
                      "flex items-start justify-between",
                      viewMode === "list" && "flex-none"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {(
                            lead.firstName?.[0] + lead.lastName?.[0]
                          ).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg leading-tight">
                          {lead.firstName} {lead.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {lead.email}
                        </p>
                      </div>
                    </div>

                    {viewMode === "grid" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onActivityLog?.(lead)}
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            Log Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onScheduleFollowup?.(lead)}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Schedule Follow-up
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onCallLead?.(lead)}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEmailLead?.(lead)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {/* Company & Industry */}
                  {lead.businessName && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{lead.businessName}</span>
                      {lead.industry && (
                        <Badge variant="secondary" className="text-xs">
                          {lead.industry.entityValue}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Status & Score */}
                  <div
                    className={cn(
                      "flex items-center justify-between",
                      viewMode === "list" && "gap-4"
                    )}
                  >
                    <Badge
                      className={cn(
                        "text-xs",
                        getStatusColor(lead.status?.entityValue)
                      )}
                    >
                      {lead.status?.entityValue?.replace(/_/g, " ")}
                    </Badge>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn("text-lg font-bold", scoreTier.color)}
                      >
                        {score}
                      </span>
                      <span className="text-lg">{scoreTier.icon}</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div
                    className={cn(
                      "flex items-center gap-4 text-sm text-muted-foreground",
                      viewMode === "list" && "flex-none"
                    )}
                  >
                    {lead.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    {lead.linkedinProfile && (
                      <div className="flex items-center gap-1">
                        <LinkedinIcon className="h-3 w-3" />
                        <span>LinkedIn</span>
                      </div>
                    )}
                  </div>

                  {/* Last Activity */}
                  <div
                    className={cn(
                      "text-xs text-muted-foreground border-t pt-3",
                      viewMode === "list" && "border-t-0 pt-0 flex-none"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Updated {getTimeAgo(lead.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3" />
                      <span>Source: {lead.source?.entityValue}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions (List Mode) */}
                {viewMode === "list" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        // Use setTimeout to prevent UI blocking
                        setTimeout(() => onCallLead?.(lead), 0);
                      }}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmailLead?.(lead);
                      }}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivityLog?.(lead);
                      }}
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onScheduleFollowup?.(lead)}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Schedule Follow-up
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? `No leads match your search for "${searchTerm}"`
              : "Get started by adding your first lead"}
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  Mail,
  Building2,
  MoreVertical,
  Activity,
  Clock,
  Star,
  LinkedinIcon,
  MessageSquare,
  Calendar,
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

interface LeadCardProps {
  lead: Lead;
  onLeadClick?: (leadId: string) => void;
  onCallLead?: (lead: Lead) => void;
  onEmailLead?: (lead: Lead) => void;
  onActivityLog?: (lead: Lead) => void;
  onScheduleFollowup?: (lead: Lead) => void;
  compact?: boolean;
  showQuickActions?: boolean;
}

export function LeadCard({
  lead,
  onLeadClick,
  onCallLead,
  onEmailLead,
  onActivityLog,
  onScheduleFollowup,
  compact = false,
  showQuickActions = true,
}: LeadCardProps) {
  const score = lead.scoreData?.totalScore || lead.leadScore || 0;

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-50 text-blue-700 border-blue-200",
      contact_attempted: "bg-yellow-50 text-yellow-700 border-yellow-200",
      in_conversation: "bg-green-50 text-green-700 border-green-200",
      qualified: "bg-purple-50 text-purple-700 border-purple-200",
      disqualified: "bg-red-50 text-red-700 border-red-200",
      not_reachable: "bg-gray-50 text-gray-700 border-gray-200",
    };
    return colors[status] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getScoreTier = (score: number, tier?: string) => {
    if (tier) {
      const tiers: Record<string, { color: string; icon: string; bg: string }> =
        {
          burning: { color: "text-red-600", icon: "🔥", bg: "bg-red-50" },
          hot: { color: "text-orange-600", icon: "🌶️", bg: "bg-orange-50" },
          warm: { color: "text-yellow-600", icon: "🟡", bg: "bg-yellow-50" },
          cold: { color: "text-blue-600", icon: "🧊", bg: "bg-blue-50" },
        };
      return (
        tiers[tier] || { color: "text-gray-600", icon: "⭐", bg: "bg-gray-50" }
      );
    }

    if (score >= 60)
      return { color: "text-red-600", icon: "🔥", bg: "bg-red-50" };
    if (score >= 40)
      return { color: "text-orange-600", icon: "🌶️", bg: "bg-orange-50" };
    if (score >= 20)
      return { color: "text-yellow-600", icon: "🟡", bg: "bg-yellow-50" };
    return { color: "text-blue-600", icon: "🧊", bg: "bg-blue-50" };
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

  const scoreTier = getScoreTier(score, lead.scoreData?.tier);

  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500 hover:border-l-blue-600">
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="space-y-3">
          {}
          <div className="flex items-start justify-between">
            <div
              className="flex items-center gap-3 flex-1 cursor-pointer"
              onClick={() => onLeadClick?.(lead.leadId)}
            >
              <Avatar className={cn("h-10 w-10", compact && "h-8 w-8")}>
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                  {(lead.firstName?.[0] + lead.lastName?.[0]).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "font-semibold text-gray-900 truncate",
                    compact ? "text-sm" : "text-base"
                  )}
                >
                  {lead.firstName} {lead.lastName}
                </h3>
                <p
                  className={cn(
                    "text-gray-500 truncate",
                    compact ? "text-xs" : "text-sm"
                  )}
                >
                  {lead.email}
                </p>
              </div>
            </div>

            {}
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full",
                scoreTier.bg
              )}
            >
              <span
                className={cn(
                  "font-bold",
                  scoreTier.color,
                  compact ? "text-sm" : "text-base"
                )}
              >
                {score}
              </span>
              <span className={compact ? "text-xs" : "text-sm"}>
                {scoreTier.icon}
              </span>
            </div>
          </div>

          {}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {lead.businessName && (
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <Building2
                    className={cn(
                      "h-3 w-3 text-gray-400 flex-shrink-0",
                      compact && "h-3 w-3"
                    )}
                  />
                  <span
                    className={cn(
                      "text-gray-600 truncate font-medium",
                      compact ? "text-xs" : "text-sm"
                    )}
                  >
                    {lead.businessName}
                  </span>
                </div>
              )}
            </div>

            <Badge
              className={cn(
                "text-xs border font-medium",
                getStatusColor(lead.status?.entityValue),
                compact && "text-xs px-1 py-0"
              )}
            >
              {lead.status?.entityValue?.replace(/_/g, " ")}
            </Badge>
          </div>

          {}
          {lead.industry && (
            <div className="flex justify-end">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs text-gray-600",
                  compact && "text-xs px-1 py-0"
                )}
              >
                {lead.industry.entityValue}
              </Badge>
            </div>
          )}

          {}
          {showQuickActions && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {}
              <div className="flex items-center gap-1">
                {lead.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 px-2 text-xs", compact && "h-6 px-1")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCallLead?.(lead);
                    }}
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("h-7 px-2 text-xs", compact && "h-6 px-1")}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEmailLead?.(lead);
                  }}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
                {lead.linkedinProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("h-7 px-2 text-xs", compact && "h-6 px-1")}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(lead.linkedinProfile, "_blank");
                    }}
                  >
                    <LinkedinIcon className="h-3 w-3 mr-1" />
                    LinkedIn
                  </Button>
                )}
              </div>

              {}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Star className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {lead.source?.entityValue}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("h-7 px-2 text-xs", compact && "h-6 px-1")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3 mr-1" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => onActivityLog?.(lead)}>
                      <Activity className="h-4 w-4 mr-2" />
                      Log Activity
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onActivityLog?.(lead)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Quick Note
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onScheduleFollowup?.(lead)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Follow-up
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {}
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Updated {getTimeAgo(lead.updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

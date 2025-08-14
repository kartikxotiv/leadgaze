"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  User,
  Clock,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Info,
  Plus,
  TrendingUp,
  Target,
  FileText,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  type:
    | "call"
    | "email"
    | "meeting"
    | "note"
    | "status_change"
    | "score_update"
    | "created"
    | "updated";
  title: string;
  description?: string;
  timestamp: string;
  user?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  outcome?: "positive" | "negative" | "neutral";
  metadata?: Record<string, any>;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  onAddActivity?: () => void;
  className?: string;
}

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "call":
      return <Phone className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    case "meeting":
      return <Calendar className="h-4 w-4" />;
    case "note":
      return <MessageSquare className="h-4 w-4" />;
    case "status_change":
      return <CheckCircle2 className="h-4 w-4" />;
    case "score_update":
      return <TrendingUp className="h-4 w-4" />;
    case "created":
      return <Plus className="h-4 w-4" />;
    case "updated":
      return <Edit3 className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

const getActivityColor = (
  type: ActivityItem["type"],
  outcome?: ActivityItem["outcome"]
) => {
  if (outcome) {
    switch (outcome) {
      case "positive":
        return "text-green-600 bg-green-50 border-green-200";
      case "negative":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
    }
  }

  switch (type) {
    case "call":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "email":
      return "text-purple-600 bg-purple-50 border-purple-200";
    case "meeting":
      return "text-indigo-600 bg-indigo-50 border-indigo-200";
    case "note":
      return "text-gray-600 bg-gray-50 border-gray-200";
    case "status_change":
      return "text-green-600 bg-green-50 border-green-200";
    case "score_update":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "created":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "updated":
      return "text-cyan-600 bg-cyan-50 border-cyan-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

const getActivityBadge = (type: ActivityItem["type"]) => {
  switch (type) {
    case "call":
      return "Call";
    case "email":
      return "Email";
    case "meeting":
      return "Meeting";
    case "note":
      return "Note";
    case "status_change":
      return "Status";
    case "score_update":
      return "Score";
    case "created":
      return "Created";
    case "updated":
      return "Updated";
    default:
      return "Activity";
  }
};

const formatActivityTime = (timestamp: string) => {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  } else if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  } else {
    return format(date, "MMM d, yyyy 'at' h:mm a");
  }
};

const groupActivitiesByDate = (activities: ActivityItem[]) => {
  const groups: Record<string, ActivityItem[]> = {};

  activities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    let key: string;

    if (isToday(date)) {
      key = "Today";
    } else if (isYesterday(date)) {
      key = "Yesterday";
    } else {
      key = format(date, "MMMM d, yyyy");
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(activity);
  });

  // Sort activities within each group by timestamp (newest first)
  Object.keys(groups).forEach((key) => {
    groups[key].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  });

  return groups;
};

export function ActivityTimeline({
  activities,
  onAddActivity,
  className = "",
}: ActivityTimelineProps) {
  const groupedActivities = groupActivitiesByDate(activities);
  const dateKeys = Object.keys(groupedActivities).sort((a, b) => {
    // Sort dates: Today, Yesterday, then chronological order (newest first)
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Activity Timeline
            </CardTitle>
            {onAddActivity && (
              <Button size="sm" onClick={onAddActivity}>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 mb-4">No activities recorded yet</p>
            {onAddActivity && (
              <Button variant="outline" onClick={onAddActivity}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Activity
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Activity Timeline
          </CardTitle>
          {onAddActivity && (
            <Button size="sm" onClick={onAddActivity}>
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {dateKeys.map((dateKey) => (
          <div key={dateKey}>
            <div className="flex items-center gap-4 mb-4">
              <h3 className="font-semibold text-sm text-gray-600">{dateKey}</h3>
              <Separator className="flex-1" />
            </div>

            <div className="space-y-4">
              {groupedActivities[dateKey].map((activity, index) => (
                <div key={activity.id} className="relative">
                  {/* Timeline line */}
                  {index < groupedActivities[dateKey].length - 1 && (
                    <div className="absolute left-6 top-12 w-px h-8 bg-gray-200" />
                  )}

                  <div className="flex gap-4">
                    {/* Activity icon */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getActivityColor(
                        activity.type,
                        activity.outcome
                      )}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>

                    {/* Activity content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {getActivityBadge(activity.type)}
                            </Badge>
                            {activity.outcome && (
                              <Badge
                                variant={
                                  activity.outcome === "positive"
                                    ? "default"
                                    : activity.outcome === "negative"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {activity.outcome}
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-medium text-sm leading-5 mb-1">
                            {activity.title}
                          </h4>

                          {activity.description && (
                            <p className="text-sm text-gray-600 mb-2 leading-5">
                              {activity.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>
                              {formatActivityTime(activity.timestamp)}
                            </span>
                            {activity.user && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>
                                    {activity.user.firstName}{" "}
                                    {activity.user.lastName}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Mock data generator for testing
export const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "created",
    title: "Lead created",
    description: "New lead added to the system",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    user: { firstName: "John", lastName: "Smith" },
  },
  {
    id: "2",
    type: "call",
    title: "Initial outreach call",
    description: "First contact attempt - left voicemail",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    user: { firstName: "Sarah", lastName: "Johnson" },
    outcome: "neutral",
  },
  {
    id: "3",
    type: "email",
    title: "Follow-up email sent",
    description: "Sent introduction email with company overview",
    timestamp: new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
    ).toISOString(),
    user: { firstName: "Sarah", lastName: "Johnson" },
    outcome: "positive",
  },
  {
    id: "4",
    type: "status_change",
    title: "Status updated to 'In Conversation'",
    description: "Lead responded to email positively",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    user: { firstName: "Sarah", lastName: "Johnson" },
    outcome: "positive",
  },
  {
    id: "5",
    type: "meeting",
    title: "Discovery call scheduled",
    description: "30-minute call scheduled for tomorrow at 2:00 PM",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    user: { firstName: "Sarah", lastName: "Johnson" },
    outcome: "positive",
  },
];

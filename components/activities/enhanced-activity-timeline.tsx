"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  User,
  Clock,
  Plus,
  RefreshCcw,
  Star,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Linkedin,
  FileText,
  TrendingUp,
  Edit,
  Loader2,
  Activity as ActivityIcon,
} from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useLeadActivities, type Activity } from "@/hooks/use-activities";
import { ActivityLogForm } from "./activity-log-form";

interface EnhancedActivityTimelineProps {
  leadId: string;
  className?: string;
}

const getActivityIcon = (activityType: Activity["activityType"]) => {
  switch (activityType) {
    case "call":
      return Phone;
    case "email":
      return Mail;
    case "linkedin":
      return Linkedin;
    case "meeting":
      return Calendar;
    case "note":
      return MessageSquare;
    case "demo":
      return FileText;
    case "proposal_sent":
      return FileText;
    case "status_changed":
      return RefreshCcw;
    case "score_updated":
      return Star;
    case "lead_created":
      return User;
    case "lead_updated":
      return Edit;
    case "follow_up_scheduled":
      return Clock;
    default:
      return ActivityIcon;
  }
};

const getActivityColor = (
  activityType: Activity["activityType"],
  outcome?: string
) => {
  // Color based on outcome first
  if (outcome) {
    if (
      outcome.toLowerCase().includes("positive") ||
      outcome.toLowerCase().includes("connected")
    ) {
      return "bg-green-100 text-green-800 border-green-200";
    }
    if (
      outcome.toLowerCase().includes("negative") ||
      outcome.toLowerCase().includes("no answer")
    ) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    if (
      outcome.toLowerCase().includes("neutral") ||
      outcome.toLowerCase().includes("voicemail")
    ) {
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  }

  // Default colors by activity type
  switch (activityType) {
    case "call":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "email":
      return "bg-green-100 text-green-800 border-green-200";
    case "linkedin":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "meeting":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "note":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "demo":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "proposal_sent":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "status_changed":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "score_updated":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatActivityTime = (timestamp: string) => {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  }
  if (isYesterday(date)) {
    return `Yesterday at ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d, yyyy h:mm a");
};

const groupActivitiesByDate = (activities: Activity[]) => {
  const groups: Record<string, Activity[]> = {};

  activities.forEach((activity) => {
    const date = new Date(activity.createdAt);
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
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  return groups;
};

export function EnhancedActivityTimeline({
  leadId,
  className,
}: EnhancedActivityTimelineProps) {
  const [showLogForm, setShowLogForm] = useState(false);
  const { data: activitiesData, isLoading, error } = useLeadActivities(leadId);

  const activities = activitiesData?.activities || [];
  const groupedActivities = groupActivitiesByDate(activities);
  const sortedDateKeys = Object.keys(groupedActivities).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Failed to load activities
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
          <CardDescription>
            Complete history of interactions and events
          </CardDescription>
        </div>
        <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Log Activity</DialogTitle>
            </DialogHeader>
            <ActivityLogForm
              relatedType="lead"
              relatedId={leadId}
              onSuccess={() => setShowLogForm(false)}
              onCancel={() => setShowLogForm(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="pt-4">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <ActivityIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No activities yet</h3>
            <p className="text-muted-foreground mb-6">
              Start engaging with this lead to see activity history here.
            </p>
            <Button
              onClick={() => setShowLogForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Log First Activity
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDateKeys.map((dateKey) => (
              <div key={dateKey}>
                <div className="flex items-center gap-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {dateKey}
                  </h3>
                  <Separator className="flex-1" />
                  <Badge variant="secondary" className="text-xs">
                    {groupedActivities[dateKey].length} activities
                  </Badge>
                </div>

                <div className="space-y-6">
                  {groupedActivities[dateKey].map((activity, index) => {
                    const Icon = getActivityIcon(activity.activityType);
                    const isLast =
                      index === groupedActivities[dateKey].length - 1;

                    return (
                      <div
                        key={activity.activityId}
                        className="relative flex items-start gap-4"
                      >
                        {/* Timeline line */}
                        {!isLast && (
                          <div className="absolute left-6 top-12 w-px h-16 bg-gray-200 dark:bg-gray-700" />
                        )}

                        {/* Activity icon */}
                        <div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2",
                            getActivityColor(
                              activity.activityType,
                              activity.outcome
                            )
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Activity content */}
                        <div className="flex-1 min-w-0 pb-6">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h4 className="font-semibold text-base leading-6">
                                {activity.subject}
                              </h4>
                              {activity.outcome && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    getActivityColor(
                                      activity.activityType,
                                      activity.outcome
                                    )
                                  )}
                                >
                                  {activity.outcome}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                              {activity.durationMinutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {activity.durationMinutes}m
                                </span>
                              )}
                              <span>
                                {formatDistanceToNow(
                                  new Date(activity.createdAt)
                                )}{" "}
                                ago
                              </span>
                            </div>
                          </div>

                          {activity.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-6">
                              {activity.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {activity.user?.firstName}{" "}
                              {activity.user?.lastName}
                            </span>
                            <span>
                              {formatActivityTime(activity.createdAt)}
                            </span>
                            {activity.direction && (
                              <Badge variant="outline" className="text-xs">
                                {activity.direction === "inbound"
                                  ? "Inbound"
                                  : "Outbound"}
                              </Badge>
                            )}
                            {activity.priority &&
                              activity.priority !== "medium" && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    activity.priority === "high" &&
                                      "border-orange-400 text-orange-600",
                                    activity.priority === "urgent" &&
                                      "border-red-400 text-red-600",
                                    activity.priority === "low" &&
                                      "border-gray-400 text-gray-600"
                                  )}
                                >
                                  {activity.priority.charAt(0).toUpperCase() +
                                    activity.priority.slice(1)}{" "}
                                  Priority
                                </Badge>
                              )}
                          </div>

                          {activity.nextFollowupDate && (
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-blue-900 dark:text-blue-100">
                                  Follow-up scheduled:
                                </span>
                                <span className="text-blue-700 dark:text-blue-200">
                                  {format(
                                    new Date(activity.nextFollowupDate),
                                    "MMM d, yyyy 'at' h:mm a"
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

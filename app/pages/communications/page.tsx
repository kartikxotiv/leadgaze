"use client";
import React, { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useActivities } from "@/hooks/use-activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { ActivityLogFormRefactored } from "@/components/activities/activity-log-form-refactored";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  Plus,
  X,
} from "lucide-react";

const typeIcon: Record<string, any> = {
  call: Phone,
  email: Mail,
  linkedin: Linkedin,
  meeting: Calendar,
  note: MessageSquare,
};

export default function CommunicationsPage() {
  const [activityType, setActivityType] = useState<string>("all");
  const [userId, setUserId] = useState<string>("");
  const [relatedType, setRelatedType] = useState<"lead" | "deal">("lead");
  const [relatedId, setRelatedId] = useState<string>("");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useActivities({
    activityType:
      activityType && activityType !== "all" ? activityType : undefined,
    userId: userId || undefined,
    limit: 50,
    offset: 0,
  });

  const activities = useMemo(() => data?.activities || [], [data]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Communications</h1>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Log Activity
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[80vh] max-h-[80vh] overflow-y-auto rounded-t-2xl"
            >
              <SheetClose className="absolute left-4 top-4 rounded-sm opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </SheetClose>
              <SheetTitle className="mt-8">Log Activity</SheetTitle>
              <SheetDescription className="mb-4">
                Select a related record and log the interaction
              </SheetDescription>
              <div className="flex items-center gap-2 mb-4">
                <Select
                  value={relatedType}
                  onValueChange={(v) => setRelatedType(v as any)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Related type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="deal">Deal</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder={`${relatedType} ID`}
                  value={relatedId}
                  onChange={(e) => setRelatedId(e.target.value)}
                  className="flex-1"
                />
              </div>
              {relatedId ? (
                <ActivityLogFormRefactored
                  relatedType={relatedType}
                  relatedId={relatedId}
                  onSuccess={() => setOpen(false)}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Select related lead/deal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    Enter a valid ID to begin logging an activity.
                  </CardContent>
                </Card>
              )}
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All activity types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="note">Note</SelectItem>
            </SelectContent>
          </Select>
          <Input
            className="w-56"
            placeholder="Filter by userId (optional)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-sm text-gray-600">Loading activities…</div>
          ) : activities.length ? (
            activities.map((a: any) => {
              const Icon = typeIcon[a.activityType] || MessageSquare;
              return (
                <div
                  key={a.activityId}
                  className="flex items-start gap-3 rounded-md border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900"
                >
                  <div className="mt-0.5">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">
                        {a.subject || a.activityType}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(a.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <Badge variant="secondary">{a.activityType}</Badge>
                      {a.outcome && <span>• {a.outcome}</span>}
                      <span>• {a.relatedType}</span>
                    </div>
                    {a.description && (
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {a.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-gray-600">No activities found.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

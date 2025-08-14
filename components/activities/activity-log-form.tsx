"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateActivity,
  type CreateActivityData,
} from "@/hooks/use-activities";
import {
  Phone,
  Mail,
  Linkedin,
  Calendar,
  MessageSquare,
  FileText,
  Upload,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ActivityLogFormProps {
  relatedType: "lead" | "deal";
  relatedId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const activityTypes = [
  {
    type: "call" as const,
    label: "Phone Call",
    icon: Phone,
    color: "bg-blue-500",
    outcomes: [
      "Connected - Positive",
      "Connected - Neutral",
      "Connected - Negative",
      "Voicemail Left",
      "No Answer",
      "Wrong Number",
      "Busy",
    ],
  },
  {
    type: "email" as const,
    label: "Email",
    icon: Mail,
    color: "bg-green-500",
    outcomes: [
      "Sent - Awaiting Response",
      "Replied - Positive",
      "Replied - Neutral",
      "Replied - Negative",
      "Bounced",
      "Auto-Reply Received",
    ],
  },
  {
    type: "linkedin" as const,
    label: "LinkedIn",
    icon: Linkedin,
    color: "bg-blue-600",
    outcomes: [
      "Connection Request Sent",
      "Connection Accepted",
      "Message Sent",
      "Reply Received - Positive",
      "Reply Received - Neutral",
      "Profile Viewed",
    ],
  },
  {
    type: "meeting" as const,
    label: "Meeting",
    icon: Calendar,
    color: "bg-purple-500",
    outcomes: [
      "Completed - Productive",
      "Completed - Neutral",
      "No Show - Prospect",
      "No Show - Both",
      "Rescheduled",
      "Cancelled",
    ],
  },
  {
    type: "note" as const,
    label: "Note",
    icon: MessageSquare,
    color: "bg-orange-500",
    outcomes: [],
  },
];

export function ActivityLogForm({
  relatedType,
  relatedId,
  onSuccess,
  onCancel,
  className,
}: ActivityLogFormProps) {
  const [activeTab, setActiveTab] = useState(activityTypes[0].type);
  const [formData, setFormData] = useState<CreateActivityData>({
    activityType: "call",
    relatedType,
    relatedId,
    subject: "",
    description: "",
    outcome: "",
    direction: "outbound",
    durationMinutes: undefined,
    priority: "medium",
    nextFollowupDate: "",
  });

  const createActivityMutation = useCreateActivity();

  const selectedActivityType = activityTypes.find(
    (type) => type.type === activeTab
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    try {
      const payload: CreateActivityData = {
        ...formData,
        activityType: activeTab,
        completedAt: new Date().toISOString(),
        durationMinutes: formData.durationMinutes || undefined,
        nextFollowupDate: formData.nextFollowupDate || undefined,
      };

      await createActivityMutation.mutateAsync(payload);

      toast.success(`${selectedActivityType?.label} logged successfully!`);

      // Reset form
      setFormData({
        activityType: activeTab,
        relatedType,
        relatedId,
        subject: "",
        description: "",
        outcome: "",
        direction: "outbound",
        durationMinutes: undefined,
        priority: "medium",
        nextFollowupDate: "",
      });

      onSuccess?.();
    } catch (error) {
      toast.error("Failed to log activity");
      console.error("Activity creation error:", error);
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as typeof activeTab);
    setFormData((prev) => ({
      ...prev,
      activityType: newTab as CreateActivityData["activityType"],
      subject: "",
      outcome: "",
      durationMinutes: undefined,
    }));
  };

  return (
    <div className="w-full">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Log Activity
        </DialogTitle>
      </DialogHeader>

      <Card className={cn("w-full max-w-4xl mt-4", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Log Activity
          </CardTitle>
          <CardDescription>
            Record your interaction and set follow-up reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Activity Type Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-5">
                {activityTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <TabsTrigger
                      key={type.type}
                      value={type.type}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {type.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {activityTypes.map((type) => (
                <TabsContent
                  key={type.type}
                  value={type.type}
                  className="space-y-4 mt-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                      {/* Subject */}
                      <div>
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              subject: e.target.value,
                            }))
                          }
                          placeholder={`Brief description of the ${type.label.toLowerCase()}`}
                          required
                        />
                      </div>

                      {/* Outcome */}
                      {type.outcomes.length > 0 && (
                        <div>
                          <Label htmlFor="outcome">Outcome</Label>
                          <Select
                            value={formData.outcome}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                outcome: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select outcome..." />
                            </SelectTrigger>
                            <SelectContent>
                              {type.outcomes.map((outcome) => (
                                <SelectItem key={outcome} value={outcome}>
                                  {outcome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Direction (for calls/emails) */}
                      {(type.type === "call" || type.type === "email") && (
                        <div>
                          <Label htmlFor="direction">Direction</Label>
                          <Select
                            value={formData.direction}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                direction: value as "inbound" | "outbound",
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="outbound">Outbound</SelectItem>
                              <SelectItem value="inbound">Inbound</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Duration (for calls/meetings) */}
                      {(type.type === "call" || type.type === "meeting") && (
                        <div>
                          <Label htmlFor="duration">Duration (minutes)</Label>
                          <Input
                            id="duration"
                            type="number"
                            min="0"
                            value={formData.durationMinutes || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                durationMinutes: e.target.value
                                  ? parseInt(e.target.value)
                                  : undefined,
                              }))
                            }
                            placeholder="e.g. 15"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                      {/* Priority */}
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              priority: value as CreateActivityData["priority"],
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-400" />
                                Low
                              </div>
                            </SelectItem>
                            <SelectItem value="medium">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                Medium
                              </div>
                            </SelectItem>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-400" />
                                High
                              </div>
                            </SelectItem>
                            <SelectItem value="urgent">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                Urgent
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Next Follow-up Date */}
                      <div>
                        <Label htmlFor="followup">Next Follow-up Date</Label>
                        <Input
                          id="followup"
                          type="datetime-local"
                          value={formData.nextFollowupDate}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              nextFollowupDate: e.target.value,
                            }))
                          }
                        />
                      </div>

                      {/* File Upload Placeholder */}
                      <div>
                        <Label>Attachments</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            Drag files here or click to upload
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Screenshots, recordings, documents
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">Details & Notes</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Add any additional details, notes, or context..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={createActivityMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {createActivityMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Log {selectedActivityType?.label}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

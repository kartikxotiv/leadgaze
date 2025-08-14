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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useCreateActivity,
  type CreateActivityData,
} from "@/hooks/use-activities";
import {
  Clock,
  Calendar as CalendarIcon,
  Bell,
  CheckCircle2,
  AlertCircle,
  Plus,
  Save,
  Loader2,
  Repeat,
  X,
} from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FollowUpSchedulerProps {
  leadId: string;
  leadName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const followUpTemplates = [
  {
    id: "initial-contact",
    name: "Initial Contact Follow-up",
    description: "Follow up after first contact",
    defaultDays: 2,
    priority: "high" as const,
    template:
      "Hi {name}, following up on our conversation. Do you have time for a quick call this week?",
  },
  {
    id: "demo-followup",
    name: "Demo Follow-up",
    description: "Follow up after product demo",
    defaultDays: 1,
    priority: "high" as const,
    template:
      "Thanks for your time during the demo! What are your thoughts on how our solution could help {company}?",
  },
  {
    id: "proposal-followup",
    name: "Proposal Follow-up",
    description: "Follow up after sending proposal",
    defaultDays: 3,
    priority: "urgent" as const,
    template:
      "Hi {name}, have you had a chance to review the proposal we sent? Happy to discuss any questions.",
  },
  {
    id: "nurture",
    name: "Nurture Touch",
    description: "Regular nurture communication",
    defaultDays: 14,
    priority: "medium" as const,
    template:
      "Hi {name}, hope you're doing well! Just wanted to share this relevant article I thought you'd find interesting.",
  },
  {
    id: "re-engagement",
    name: "Re-engagement",
    description: "Re-engage cold leads",
    defaultDays: 30,
    priority: "low" as const,
    template:
      "Hi {name}, it's been a while since we last spoke. Has anything changed regarding your {industry} challenges?",
  },
];

const quickScheduleOptions = [
  { label: "Tomorrow", value: 1, unit: "days" },
  { label: "In 3 days", value: 3, unit: "days" },
  { label: "Next week", value: 1, unit: "weeks" },
  { label: "In 2 weeks", value: 2, unit: "weeks" },
  { label: "Next month", value: 1, unit: "months" },
];

export function FollowUpScheduler({
  leadId,
  leadName = "Lead",
  onSuccess,
  onCancel,
  className,
}: FollowUpSchedulerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState<CreateActivityData>({
    activityType: "task",
    relatedType: "lead",
    relatedId: leadId,
    subject: "",
    description: "",
    priority: "medium",
    dueDate: "",
    scheduledAt: "",
  });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [showCalendar, setShowCalendar] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<{
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    endDate?: string;
  }>({
    frequency: "weekly",
    interval: 1,
  });

  const createActivityMutation = useCreateActivity();

  const handleTemplateSelect = (templateId: string) => {
    const template = followUpTemplates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormData((prev) => ({
        ...prev,
        subject: template.name,
        description: template.template,
        priority: template.priority,
      }));

      // Set default due date
      const defaultDate = addDays(new Date(), template.defaultDays);
      setSelectedDate(defaultDate);
      setFormData((prev) => ({
        ...prev,
        dueDate: format(defaultDate, "yyyy-MM-dd") + "T" + selectedTime,
      }));
    }
  };

  const handleQuickSchedule = (option: (typeof quickScheduleOptions)[0]) => {
    let scheduledDate: Date;

    if (option.unit === "days") {
      scheduledDate = addDays(new Date(), option.value);
    } else if (option.unit === "weeks") {
      scheduledDate = addWeeks(new Date(), option.value);
    } else {
      scheduledDate = addMonths(new Date(), option.value);
    }

    setSelectedDate(scheduledDate);
    setFormData((prev) => ({
      ...prev,
      dueDate: format(scheduledDate, "yyyy-MM-dd") + "T" + selectedTime,
    }));
    setShowCalendar(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setFormData((prev) => ({
        ...prev,
        dueDate: format(date, "yyyy-MM-dd") + "T" + selectedTime,
      }));
      setShowCalendar(false);
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      setFormData((prev) => ({
        ...prev,
        dueDate: format(selectedDate, "yyyy-MM-dd") + "T" + time,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    if (!formData.dueDate) {
      toast.error("Due date is required");
      return;
    }

    if (!formData.relatedId || formData.relatedId.trim() === "") {
      toast.error(
        "Please select a lead or deal before creating the follow-up task"
      );
      return;
    }

    try {
      const payload: CreateActivityData = {
        ...formData,
        scheduledAt: formData.dueDate,
      };

      await createActivityMutation.mutateAsync(payload);

      // If recurring, create additional follow-ups
      if (isRecurring && recurringPattern.endDate) {
        const endDate = new Date(recurringPattern.endDate);
        let currentDate = new Date(formData.dueDate);
        let count = 0;
        const maxRecurring = 10; // Limit to prevent too many tasks

        while (currentDate < endDate && count < maxRecurring) {
          if (recurringPattern.frequency === "daily") {
            currentDate = addDays(currentDate, recurringPattern.interval);
          } else if (recurringPattern.frequency === "weekly") {
            currentDate = addWeeks(currentDate, recurringPattern.interval);
          } else {
            currentDate = addMonths(currentDate, recurringPattern.interval);
          }

          if (currentDate <= endDate) {
            const recurringPayload: CreateActivityData = {
              ...formData,
              subject: `${formData.subject} (Recurring ${count + 1})`,
              scheduledAt: currentDate.toISOString(),
              dueDate: currentDate.toISOString(),
            };

            await createActivityMutation.mutateAsync(recurringPayload);
            count++;
          }
        }
      }

      toast.success("Follow-up scheduled successfully!");

      // Reset form
      setFormData({
        activityType: "task",
        relatedType: "lead",
        relatedId: leadId,
        subject: "",
        description: "",
        priority: "medium",
        dueDate: "",
        scheduledAt: "",
      });
      setSelectedTemplate("");
      setSelectedDate(undefined);
      setIsRecurring(false);

      onSuccess?.();
    } catch (error) {
      toast.error("Failed to schedule follow-up");
      console.error("Follow-up scheduling error:", error);
    }
  };

  return (
    <div className="w-full">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Schedule Follow-up
        </DialogTitle>
      </DialogHeader>

      <Card className={cn("w-full max-w-4xl mt-4", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Follow-up for {leadName}
          </CardTitle>
          <CardDescription>
            Set reminders and create follow-up tasks to stay on top of your
            pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quick Templates */}
            <div>
              <Label className="text-base font-semibold">Quick Templates</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {followUpTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={cn(
                      "cursor-pointer transition-all border-2 hover:shadow-md",
                      selectedTemplate === template.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">
                          {template.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            template.priority === "urgent" &&
                              "border-red-400 text-red-600",
                            template.priority === "high" &&
                              "border-orange-400 text-orange-600",
                            template.priority === "medium" &&
                              "border-blue-400 text-blue-600",
                            template.priority === "low" &&
                              "border-gray-400 text-gray-600"
                          )}
                        >
                          {template.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>+{template.defaultDays} days</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    placeholder="Follow-up task title"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description & Notes</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Add context, talking points, or notes..."
                    rows={4}
                  />
                </div>

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
                          <div className="w-2 h-2 rounded-full bg-blue-400" />
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
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Quick Schedule Options */}
                <div>
                  <Label className="text-sm font-medium">Quick Schedule</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {quickScheduleOptions.map((option) => (
                      <Button
                        key={option.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickSchedule(option)}
                        className="text-xs"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date</Label>
                    <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? (
                            format(selectedDate, "MMM d, yyyy")
                          ) : (
                            <span>Pick date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={selectedTime}
                      onChange={(e) => handleTimeChange(e.target.value)}
                    />
                  </div>
                </div>

                {/* Recurring Options */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="recurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="recurring" className="text-sm font-medium">
                      Make this recurring
                    </Label>
                    <Repeat className="h-4 w-4 text-gray-400" />
                  </div>

                  {isRecurring && (
                    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Frequency</Label>
                          <Select
                            value={recurringPattern.frequency}
                            onValueChange={(value) =>
                              setRecurringPattern((prev) => ({
                                ...prev,
                                frequency: value as
                                  | "daily"
                                  | "weekly"
                                  | "monthly",
                              }))
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Every</Label>
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            value={recurringPattern.interval}
                            onChange={(e) =>
                              setRecurringPattern((prev) => ({
                                ...prev,
                                interval: parseInt(e.target.value) || 1,
                              }))
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">End Date</Label>
                        <Input
                          type="date"
                          value={recurringPattern.endDate}
                          onChange={(e) =>
                            setRecurringPattern((prev) => ({
                              ...prev,
                              endDate: e.target.value,
                            }))
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Selection Preview */}
                {selectedDate && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-sm">
                      <Bell className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        Scheduled for:
                      </span>
                      <span className="text-blue-700 dark:text-blue-200">
                        {format(selectedDate, "EEEE, MMM d, yyyy")} at{" "}
                        {selectedTime}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                Schedule Follow-up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  Upload,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { FormLayout } from "@/components/common/form-layout";
import {
  TextField,
  TextareaField,
  SelectField,
  PrioritySelect,
} from "@/components/common/form-fields";
import { CRMFormActions } from "@/components/common/form-actions";
import { DatePicker } from "@/components/common/date-picker";

interface ActivityLogFormProps {
  relatedType: "lead" | "deal";
  relatedId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

const activityTypes = [
  {
    type: "call",
    label: "Call",
    icon: Phone,
    outcomes: ["Positive", "Neutral", "Negative", "No Answer", "Voicemail"],
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    outcomes: ["Sent", "Opened", "Replied", "Bounced", "Unsubscribed"],
  },
  {
    type: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    outcomes: [
      "Connection Sent",
      "Message Sent",
      "Post Liked",
      "Profile Viewed",
    ],
  },
  {
    type: "meeting",
    label: "Meeting",
    icon: Calendar,
    outcomes: ["Completed", "Rescheduled", "Cancelled", "No Show"],
  },
  {
    type: "note",
    label: "Note",
    icon: MessageSquare,
    outcomes: ["Information", "Follow-up", "Research", "Internal"],
  },
];

export function ActivityLogFormRefactored({
  relatedType,
  relatedId,
  onSuccess,
  onCancel,
  className,
}: ActivityLogFormProps) {
  const [activeTab, setActiveTab] = useState("call");
  const [formData, setFormData] = useState<CreateActivityData>({
    activityType: "call",
    subject: "",
    description: "",
    outcome: "",
    direction: "outbound",
    priority: "medium",
    relatedType,
    relatedId,
    durationMinutes: undefined,
    nextFollowupDate: "",
  });

  const createActivityMutation = useCreateActivity();
  const selectedActivityType = activityTypes.find(
    (type) => type.type === activeTab
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setFormData((prev) => ({
      ...prev,
      activityType: value as CreateActivityData["activityType"],
      outcome: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    try {
      await createActivityMutation.mutateAsync(formData);
      toast.success(`${selectedActivityType?.label} logged successfully`);

     
      setFormData({
        activityType: "call",
        subject: "",
        description: "",
        outcome: "",
        direction: "outbound",
        priority: "medium",
        relatedType,
        relatedId,
        durationMinutes: undefined,
        nextFollowupDate: "",
      });
      setActiveTab("call");

      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to log ${selectedActivityType?.label}`);
    }
  };

  const updateFormData = (field: keyof CreateActivityData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <FormLayout
      title="Log Activity"
      description="Record your interaction and set follow-up reminders"
      icon={<Plus className="h-5 w-5" />}
      className={className}
      showDialogHeader={true}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {}
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
                {}
                <div className="space-y-4">
                  <TextField
                    label="Subject"
                    value={formData.subject}
                    onChange={(value) => updateFormData("subject", value)}
                    placeholder={`Brief description of the ${type.label.toLowerCase()}`}
                    required
                  />

                  {type.outcomes.length > 0 && (
                    <SelectField
                      label="Outcome"
                      value={formData.outcome}
                      onChange={(value) => updateFormData("outcome", value)}
                      options={type.outcomes.map((outcome) => ({
                        value: outcome.toLowerCase().replace(/\s+/g, "_"),
                        label: outcome,
                      }))}
                      placeholder="Select outcome..."
                    />
                  )}

                  {(type.type === "call" || type.type === "email") && (
                    <SelectField
                      label="Direction"
                      value={formData.direction || "outbound"}
                      onChange={(value) => updateFormData("direction", value)}
                      options={[
                        { value: "outbound", label: "Outbound" },
                        { value: "inbound", label: "Inbound" },
                      ]}
                    />
                  )}

                  {(type.type === "call" || type.type === "meeting") && (
                    <TextField
                      label="Duration (minutes)"
                      value={formData.durationMinutes?.toString() || ""}
                      onChange={(value) =>
                        updateFormData(
                          "durationMinutes",
                          value ? parseInt(value) : undefined
                        )
                      }
                      type="text"
                      placeholder="e.g. 15"
                    />
                  )}
                </div>

                {}
                <div className="space-y-4">
                  <PrioritySelect
                    value={formData.priority}
                    onChange={(value) => updateFormData("priority", value)}
                  />

                  <DatePicker
                    label="Next Follow-up Date"
                    value={
                      formData.nextFollowupDate
                        ? new Date(formData.nextFollowupDate)
                        : undefined
                    }
                    onChange={(date) =>
                      updateFormData(
                        "nextFollowupDate",
                        date?.toISOString() || ""
                      )
                    }
                    includeTime={true}
                    placeholder="Set follow-up date..."
                  />

                  {}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Attachments
                    </label>
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

              {}
              <TextareaField
                label="Details & Notes"
                value={formData.description}
                onChange={(value) => updateFormData("description", value)}
                placeholder="Add any additional details, notes, or context..."
                rows={4}
              />
            </TabsContent>
          ))}
        </Tabs>

        <CRMFormActions
          onCancel={onCancel}
          actionText={`Log ${selectedActivityType?.label}`}
          isLoading={createActivityMutation.isPending}
        />
      </form>
    </FormLayout>
  );
}

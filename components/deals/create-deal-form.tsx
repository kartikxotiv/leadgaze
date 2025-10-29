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
import { useCreateDeal, type CreateDealData } from "@/hooks/use-deals";
import { useLeads } from "@/hooks/use-leads";
import {
  DollarSign,
  Calendar,
  Target,
  User,
  Save,
  Loader2,
  X,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CreateDealFormProps {
  preSelectedLeadId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function CreateDealForm({
  preSelectedLeadId,
  onSuccess,
  onCancel,
  className,
}: CreateDealFormProps) {
  const [formData, setFormData] = useState<CreateDealData>({
    leadId: preSelectedLeadId || "",
    title: "",
    description: "",
    value: 0,
    currency: "USD",
    stage: "qualification",
    probability: 20,
    priority: "medium",
    expectedCloseDate: "",
  });
  const [valueInput, setValueInput] = useState<string>("");
  const [leadSearch, setLeadSearch] = useState("");

  const createDealMutation = useCreateDeal();
  const { data: leadsData } = useLeads();

  const leads = leadsData?.leads || [];
  const filteredLeads = leads.filter((lead) =>
    `${lead.firstName} ${lead.lastName} ${lead.businessName}`
      .toLowerCase()
      .includes(leadSearch.toLowerCase())
  );

  const selectedLead = leads.find((lead) => lead.leadId === formData.leadId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.leadId) {
      toast.error("Please select a lead");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Deal title is required");
      return;
    }

    const numericValue = valueInput.trim() === "" ? NaN : parseFloat(valueInput);
    if (!isFinite(numericValue) || numericValue <= 0) {
      toast.error("Deal value must be greater than 0");
      return;
    }

    try {
     
      let title = formData.title;
      if (!title.trim() && selectedLead) {
        title = `Deal with ${
          selectedLead.businessName ||
          `${selectedLead.firstName} ${selectedLead.lastName}`
        }`;
      }

    const payload: CreateDealData = {
        ...formData,
        title: title.trim(),
      value: numericValue,
        expectedCloseDate: formData.expectedCloseDate || undefined,
      };

      await createDealMutation.mutateAsync(payload);

      toast.success("Deal created successfully!");

     
      setFormData({
        leadId: preSelectedLeadId || "",
        title: "",
        description: "",
        value: 0,
        currency: "USD",
        stage: "qualification",
        probability: 20,
        priority: "medium",
        expectedCloseDate: "",
      });
      setValueInput("");
      setLeadSearch("");

      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create deal");
      console.error("Deal creation error:", error);
    }
  };

  const handleStageChange = (stage: CreateDealData["stage"]) => {
    const stageProbabilities = {
      qualification: 20,
      proposal: 40,
      negotiation: 70,
      decision: 90,
      closed_won: 100,
      closed_lost: 0,
    };

    setFormData((prev) => ({
      ...prev,
      stage,
      probability:
        stageProbabilities[stage as keyof typeof stageProbabilities] || 20,
    }));
  };

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Create New Deal
        </CardTitle>
        <CardDescription>
          Convert a lead into a sales opportunity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {}
          <div className="space-y-2">
            <Label htmlFor="lead">Lead *</Label>
            {!preSelectedLeadId ? (
              <div>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select
                  value={formData.leadId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, leadId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredLeads.map((lead) => (
                      <SelectItem key={lead.leadId} value={lead.leadId}>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">
                              {lead.firstName} {lead.lastName}
                            </div>
                            {lead.businessName && (
                              <div className="text-xs text-gray-500">
                                {lead.businessName}
                              </div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              selectedLead && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-100">
                        {selectedLead.firstName} {selectedLead.lastName}
                      </div>
                      {selectedLead.businessName && (
                        <div className="text-sm text-blue-700 dark:text-blue-200">
                          {selectedLead.businessName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {}
            <div className="space-y-4">
              {}
              <div>
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Q1 Software License Deal"
                  required
                />
              </div>

              {}
              <div>
                <Label htmlFor="value">Deal Value *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="value"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={valueInput}
                      onChange={(e) => {
                        let v = e.target.value;
                       
                        v = v.replace(/[^\d.]/g, "");
                        const parts = v.split(".");
                        if (parts.length > 2) return;
                       
                        if (!v.startsWith("0.")) {
                          v = v.replace(/^0+(?=\d)/, "");
                        }
                        setValueInput(v);
                      }}
                      placeholder="0.00"
                      className="pl-8"
                      required
                    />
                  </div>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, currency: value }))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {}
              <div>
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={handleStageChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualification">Qualification</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="decision">Decision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {}
            <div className="space-y-4">
              {}
              <div>
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      probability: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              {}
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: value as CreateDealData["priority"],
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

              {}
              <div>
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="expectedCloseDate"
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expectedCloseDate: e.target.value,
                      }))
                    }
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </div>

          {}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Add deal notes, requirements, or context..."
              rows={3}
            />
          </div>

          {}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={createDealMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {createDealMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Create Deal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

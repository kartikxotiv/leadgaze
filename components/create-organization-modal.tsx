"use client";

import { useState } from "react";
import { useAuth, useCreateOrganization } from "@/lib/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
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
import { Building2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface CreateOrganizationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Industry types based on common CRM use cases
const INDUSTRY_TYPES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Real Estate",
  "Manufacturing",
  "Retail",
  "Education",
  "Marketing & Advertising",
  "Consulting",
  "Professional Services",
  "Non-profit",
  "Other",
];

// Company sizes matching auth_phase1.md specifications
const COMPANY_SIZES = [
  { value: "1", label: "Just me (1 employee)" },
  { value: "2-10", label: "Small business (2-10 employees)" },
  { value: "11-50", label: "Growing business (11-50 employees)" },
  { value: "51-200", label: "Medium business (51-200 employees)" },
  { value: "201-1000", label: "Large business (201-1000 employees)" },
  { value: "1000+", label: "Enterprise (1000+ employees)" },
];

export function CreateOrganizationSheet({
  open,
  onOpenChange,
}: CreateOrganizationSheetProps) {
  const { user } = useAuth();
  const createOrganizationMutation = useCreateOrganization();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industryType: "",
    companySize: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      industryType: "",
      companySize: "",
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }

    if (!formData.industryType) {
      toast.error("Please select an industry type");
      return;
    }

    if (!formData.companySize) {
      toast.error("Please select company size");
      return;
    }

    if (!user?.userId) {
      toast.error("User information not found. Please try logging in again.");
      return;
    }

    try {
      await createOrganizationMutation.mutateAsync({
        userId: user.userId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        industryType: formData.industryType,
        companySize: formData.companySize,
      });

      toast.success(`Organization "${formData.name}" created successfully!`);
      handleClose();
    } catch (error) {
      console.error("Failed to create organization:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create organization. Please try again."
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[80vh] max-h-[80vh] overflow-y-auto rounded-t-2xl"
      >
        {/* Custom Close Button - Top Left */}
        <SheetClose className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetClose>

        <SheetHeader className="mt-8">
          <SheetTitle className="flex items-center gap-2 text-left">
            <Building2 className="h-5 w-5" />
            Create New Organization
          </SheetTitle>
          <SheetDescription className="text-left">
            Create a new organization to manage your team and projects. You'll
            be assigned as the owner with full access.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="org-name">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="org-name"
              placeholder="Enter organization name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={createOrganizationMutation.isPending}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="org-description">Description (Optional)</Label>
            <Textarea
              id="org-description"
              placeholder="Brief description of your organization"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              disabled={createOrganizationMutation.isPending}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Industry Type */}
          <div className="space-y-2">
            <Label>
              Industry Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.industryType}
              onValueChange={(value) =>
                handleInputChange("industryType", value)
              }
              disabled={createOrganizationMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_TYPES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Company Size */}
          <div className="space-y-2">
            <Label>
              Company Size <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.companySize}
              onValueChange={(value) => handleInputChange("companySize", value)}
              disabled={createOrganizationMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trial Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              🎉 Your new organization will start with a{" "}
              <strong>14-day free trial</strong> including:
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 ml-4 list-disc">
              <li>Up to 5 team members</li>
              <li>Up to 3 workspaces</li>
              <li>All CRM features included</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createOrganizationMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createOrganizationMutation.isPending || !formData.name.trim()
              }
              className="flex-1"
            >
              {createOrganizationMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

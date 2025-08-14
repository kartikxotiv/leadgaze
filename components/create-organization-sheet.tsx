"use client";

import { useState } from "react";
import { useAuth, useCreateOrganization } from "@/lib/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Loader2, X, ChevronLeft } from "lucide-react";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industryType: "",
    companySize: "",
  });

  const totalSteps = 3;

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
    setCurrentStep(1);
  };

  const handleClose = () => {
    try {
      resetForm();
      onOpenChange(false);

      // Force clear any lingering loading states
      if (createOrganizationMutation.isPending) {
        // Cancel any pending mutations if possible
        console.warn("Force closing sheet while mutation is pending");
      }
    } catch (error) {
      console.error("Error in handleClose:", error);
      onOpenChange(false); // Force close anyway
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.industryType;
      case 3:
        return formData.companySize;
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only submit if we're on the final step
    if (currentStep !== totalSteps) {
      return;
    }

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

      // Ensure proper cleanup and closure
      setTimeout(() => {
        handleClose();
      }, 100); // Small delay to ensure state updates complete
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
        className="h-[80vh] max-h-[80vh] overflow-hidden rounded-t-2xl p-0 [&>button]:hidden"
      >
        {/* Accessibility Title */}
        <SheetHeader className="sr-only">
          <SheetTitle>
            Create Your Organization - Step {currentStep} of {totalSteps}
          </SheetTitle>
        </SheetHeader>

        {/* Header with close button positioned on right */}
        <div className="relative flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <SheetClose className="absolute right-4 top-4 rounded-full p-1.5 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-colors">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <div className="w-full text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Your Organization
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 font-medium">
              Step {currentStep} of {totalSteps}
            </p>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: totalSteps }, (_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index + 1 <= currentStep
                      ? "bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Fixed Height */}
        <div className="flex flex-col" style={{ height: "calc(80vh - 120px)" }}>
          {/* Form Content */}
          <div className="flex-1 p-3 overflow-hidden">
            <div className="flex justify-center h-full">
              <div className="w-full max-w-4xl space-y-4">
                {/* Step 1: Organization Identity */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {/* Spacer to match back icon area in other steps */}
                    <div className="flex justify-start mb-4">
                      <div className="p-2 opacity-0">
                        <span className="text-sm font-medium">Back</span>
                      </div>
                    </div>
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Let's start with the basics
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Give your organization a name and description
                      </p>
                    </div>

                    <div>
                      <Label
                        htmlFor="org-name"
                        className="text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Organization Name{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="org-name"
                        placeholder="e.g., Acme Corporation, Startup Inc."
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        disabled={createOrganizationMutation.isPending}
                        maxLength={100}
                        className="mt-1.5 h-11"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="org-description"
                        className="text-sm font-medium text-gray-900 dark:text-white"
                      >
                        Description{" "}
                        <span className="text-gray-400">(optional)</span>
                      </Label>
                      <Textarea
                        id="org-description"
                        placeholder="Brief description of your organization..."
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        disabled={createOrganizationMutation.isPending}
                        maxLength={500}
                        rows={3}
                        className="mt-1.5 resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Industry Selection */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    {/* Back Icon */}
                    <div className="flex justify-start mb-4">
                      <button
                        onClick={prevStep}
                        disabled={createOrganizationMutation.isPending}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="text-sm font-medium">Back</span>
                      </button>
                    </div>
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        What industry are you in?
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This helps us customize your experience
                      </p>
                    </div>

                    {/* Industry Selection */}
                    <div className="flex justify-center">
                      <div className="w-full max-w-2xl">
                        <div className="grid grid-cols-3 gap-3">
                          {INDUSTRY_TYPES.map((industry) => (
                            <button
                              key={industry}
                              type="button"
                              onClick={() =>
                                handleInputChange("industryType", industry)
                              }
                              disabled={createOrganizationMutation.isPending}
                              className={`p-4 rounded-lg border text-sm font-medium transition-all text-center ${
                                formData.industryType === industry
                                  ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/30 dark:border-blue-400 dark:text-blue-300"
                                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {industry}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Team Size Selection */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    {/* Back Icon */}
                    <div className="flex justify-start mb-4">
                      <button
                        onClick={prevStep}
                        disabled={createOrganizationMutation.isPending}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="text-sm font-medium">Back</span>
                      </button>
                    </div>
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        How big is your team?
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Choose the option that best describes your organization
                      </p>
                    </div>

                    {/* Team Size Selection */}
                    <div className="flex justify-center">
                      <div className="w-full max-w-md space-y-3">
                        {COMPANY_SIZES.map((size) => (
                          <button
                            key={size.value}
                            type="button"
                            onClick={() =>
                              handleInputChange("companySize", size.value)
                            }
                            disabled={createOrganizationMutation.isPending}
                            className={`w-full p-4 rounded-lg border text-left transition-all ${
                              formData.companySize === size.value
                                ? "bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/30 dark:border-blue-400 dark:text-blue-300"
                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <div className="font-medium text-sm leading-tight">
                              {size.label}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Action Buttons at Bottom */}
          <div className="border-t-2 border-gray-300 dark:border-gray-600 p-6 bg-white dark:bg-gray-800 shadow-lg shrink-0">
            <form onSubmit={handleSubmit}>
              <div className="flex justify-center">
                <div className="flex justify-center w-full max-w-4xl">
                  {/* Consistent Main Action Button */}
                  {currentStep === totalSteps ? (
                    <Button
                      type="submit"
                      disabled={
                        createOrganizationMutation.isPending ||
                        !canProceedToNextStep()
                      }
                      className="h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md font-semibold min-w-48"
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
                  ) : (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceedToNextStep()}
                      className="h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:text-gray-600 disabled:cursor-not-allowed shadow-md font-semibold min-w-48"
                    >
                      Continue
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SignupFormData {
 
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;

 
  organizationName: string;
  organizationDescription?: string;

 
  companySize: string;
  industryType: string;
  primaryUseCase: string;

 
  currentTool: string;
  dataImport: boolean;

 
  selectedFeatures: string[];
  planType: string;

 
  agreeToTerms: boolean;
  emailVerification: boolean;
}

const initialFormData: SignupFormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phoneNumber: "",
  organizationName: "",
  organizationDescription: "",
  companySize: "",
  industryType: "",
  primaryUseCase: "",
  currentTool: "",
  dataImport: false,
  selectedFeatures: [],
  planType: "trial",
  agreeToTerms: false,
  emailVerification: false,
};

const companysizes = [
  { value: "1", label: "Just me (1 employee)" },
  { value: "2-10", label: "Small business (2-10 employees)" },
  { value: "11-50", label: "Growing business (11-50 employees)" },
  { value: "51-200", label: "Medium business (51-200 employees)" },
  { value: "201-1000", label: "Large business (201-1000 employees)" },
  { value: "1000+", label: "Enterprise (1000+ employees)" },
];

const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Real Estate",
  "Consulting",
  "Marketing",
  "Other",
];

const useCases = [
  "Lead Management",
  "Customer Support",
  "Sales Pipeline",
  "Project Management",
  "Team Collaboration",
  "Client Management",
  "Other",
];

const currentTools = [
  "Spreadsheets (Excel/Google Sheets)",
  "Email & Calendar",
  "Notion/Obsidian",
  "Airtable",
  "HubSpot",
  "Salesforce",
  "Pipedrive",
  "Other CRM",
  "No current system",
];

const features = [
  {
    id: "contacts",
    label: "Contact Management",
    description: "Organize and track customer information",
  },
  {
    id: "leads",
    label: "Lead Tracking",
    description: "Manage sales opportunities",
  },
  {
    id: "pipeline",
    label: "Sales Pipeline",
    description: "Visualize sales stages",
  },
  {
    id: "reports",
    label: "Analytics & Reports",
    description: "Insights and performance metrics",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Connect with other tools",
  },
  {
    id: "automation",
    label: "Workflow Automation",
    description: "Automate repetitive tasks",
  },
];

interface MultiStepSignupProps {
  onSuccess?: () => void;
}

export function MultiStepSignup({ onSuccess }: MultiStepSignupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SignupFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const updateFormData = (updates: Partial<SignupFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.password &&
          formData.confirmPassword &&
          formData.password === formData.confirmPassword &&
          formData.password.length >= 8 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
        );
      case 2:
        return !!formData.organizationName;
      case 3:
        return !!(
          formData.companySize &&
          formData.industryType &&
          formData.primaryUseCase
        );
      case 4:
        return !!formData.currentTool;
      case 5:
        return !!(formData.selectedFeatures.length > 0);
      case 6:
        return formData.agreeToTerms;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber,
          organizationName: formData.organizationName,
          setupQuestions: {
            companySize: formData.companySize,
            whatBringsYou: formData.primaryUseCase,
            currentRole: formData.currentTool,
            industryType: formData.industryType,
            selectedFeatures: formData.selectedFeatures,
            dataImport: formData.dataImport,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Account created successfully! Welcome to your CRM!");

       
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem(
            "organizations",
            JSON.stringify(data.organizations)
          );
          localStorage.setItem(
            "currentOrganization",
            JSON.stringify(data.currentOrganization)
          );
        }

        onSuccess?.();
       
        setTimeout(() => {
         
          if (typeof window !== "undefined") {
           
            window.history.replaceState(null, "", "/pages/dashboard");
            window.location.replace("/pages/dashboard");
          }
        }, 100);
      } else {
        toast.error(data.error || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    updateFormData({ firstName: e.target.value })
                  }
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateFormData({ lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData({ email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  updateFormData({ phoneNumber: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => updateFormData({ password: e.target.value })}
                  placeholder="At least 8 characters"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    updateFormData({ confirmPassword: e.target.value })
                  }
                  placeholder="Confirm your password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {formData.password !== formData.confirmPassword &&
                formData.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    Passwords don't match
                  </p>
                )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Input
                id="organizationName"
                value={formData.organizationName}
                onChange={(e) =>
                  updateFormData({ organizationName: e.target.value })
                }
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <Label htmlFor="organizationDescription">
                Organization Description (Optional)
              </Label>
              <Textarea
                id="organizationDescription"
                value={formData.organizationDescription}
                onChange={(e) =>
                  updateFormData({ organizationDescription: e.target.value })
                }
                placeholder="Brief description of your organization..."
                rows={3}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Company Size *</Label>
              <Select
                value={formData.companySize}
                onValueChange={(value) =>
                  updateFormData({ companySize: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  {companysizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Industry *</Label>
              <Select
                value={formData.industryType}
                onValueChange={(value) =>
                  updateFormData({ industryType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Primary Use Case *</Label>
              <Select
                value={formData.primaryUseCase}
                onValueChange={(value) =>
                  updateFormData({ primaryUseCase: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="What will you primarily use this for?" />
                </SelectTrigger>
                <SelectContent>
                  {useCases.map((useCase) => (
                    <SelectItem key={useCase} value={useCase}>
                      {useCase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Current Tool/System *</Label>
              <RadioGroup
                value={formData.currentTool}
                onValueChange={(value) =>
                  updateFormData({ currentTool: value })
                }
                className="grid grid-cols-1 gap-3"
              >
                {currentTools.map((tool) => (
                  <div key={tool} className="flex items-center space-x-2">
                    <RadioGroupItem value={tool} id={tool} />
                    <Label
                      htmlFor={tool}
                      className="font-normal cursor-pointer"
                    >
                      {tool}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="dataImport"
                checked={formData.dataImport}
                onCheckedChange={(checked) =>
                  updateFormData({ dataImport: checked as boolean })
                }
              />
              <Label htmlFor="dataImport" className="font-normal">
                I'd like help importing my existing data
              </Label>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label>Features You're Interested In *</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select the features that matter most to your business
              </p>
              <div className="grid grid-cols-1 gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg"
                  >
                    <Checkbox
                      id={feature.id}
                      checked={formData.selectedFeatures.includes(feature.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFormData({
                            selectedFeatures: [
                              ...formData.selectedFeatures,
                              feature.id,
                            ],
                          });
                        } else {
                          updateFormData({
                            selectedFeatures: formData.selectedFeatures.filter(
                              (id) => id !== feature.id
                            ),
                          });
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor={feature.id}
                        className="font-medium cursor-pointer"
                      >
                        {feature.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    updateFormData({ agreeToTerms: checked as boolean })
                  }
                />
                <Label htmlFor="agreeToTerms" className="font-normal">
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </a>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emailVerification"
                  checked={formData.emailVerification}
                  onCheckedChange={(checked) =>
                    updateFormData({ emailVerification: checked as boolean })
                  }
                />
                <Label htmlFor="emailVerification" className="font-normal">
                  Send me product updates and tips (optional)
                </Label>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">
                    You're all set!
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your 14-day free trial will begin immediately. No credit
                    card required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = [
    "Personal Information",
    "Organization Details",
    "Setup Questions",
    "Current Tools",
    "Features & Plan",
    "Terms & Complete",
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
            </CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </div>
        </div>
        <Progress value={progress} className="mt-4" />
      </CardHeader>

      <CardContent>
        <div className="min-h-[400px]">{renderStep()}</div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || isLoading}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          {currentStep < totalSteps ? (
            <Button
              onClick={nextStep}
              disabled={!validateStep(currentStep) || isLoading}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!validateStep(currentStep) || isLoading}
              className="flex items-center space-x-2"
            >
              <span>
                {isLoading ? "Creating Account..." : "Complete Setup"}
              </span>
              {!isLoading && <CheckCircle className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

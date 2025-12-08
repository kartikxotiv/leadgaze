"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Globe,
  MapPin,
  User,
  Phone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useCreateBusiness } from "@/hooks/use-business";
import { toast } from "sonner";
import type { BusinessInsert } from "@/lib/data/business";
import { AddBusinessTypeDialog } from "./add-business-type-dialog";
import { AddIndustryDialog } from "./add-industry-dialog";
import { useAuthStore } from "@/lib/stores/auth-store";

// Business size options
const BUSINESS_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

// Constants for add options
const ADD_BUSINESS_TYPE_SELECT_VALUE = "__add_new_business_type__";
const ADD_INDUSTRY_SELECT_VALUE = "__add_new_industry__";

interface FormData {
  business_name: string;
  business_type: string;
  industry: string;
  business_contact: string;
  business_size: string;
  business_country: string;
  website: string;
  description: string;
  account_owner: string;
  business_address: string;
}

const INITIAL_FORM_DATA: FormData = {
  business_name: "",
  business_type: "",
  industry: "",
  business_contact: "",
  business_size: "",
  business_country: "",
  website: "",
  description: "",
  account_owner: "",
  business_address: "",
};

interface AddBusinessProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddBusiness({ open, onOpenChange }: AddBusinessProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const createBusinessMutation = useCreateBusiness();

  // Check if user is admin
  const { currentOrganization } = useAuthStore();
  const isAdmin = useMemo(() => {
    if (!currentOrganization) {
      console.log("[AddBusiness] No current organization found");
      return false;
    }
    const userRole = currentOrganization.role?.toLowerCase()?.trim();
    const roleDisplayName = currentOrganization.roleDisplayName
      ?.toLowerCase()
      ?.trim();

    // Check both role and roleDisplayName
    const isAdminUser =
      ["owner", "system_admin", "admin"].includes(userRole || "") ||
      ["owner", "system admin", "administrator"].includes(
        roleDisplayName || ""
      );

    console.log("[AddBusiness] Admin check:", {
      role: currentOrganization.role,
      roleDisplayName: currentOrganization.roleDisplayName,
      userRole,
      roleDisplayNameLower: roleDisplayName,
      isAdminUser,
    });

    return isAdminUser;
  }, [currentOrganization]);

  // State for custom business types and industries
  const [customBusinessTypes, setCustomBusinessTypes] = useState<string[]>([]);
  const [customIndustries, setCustomIndustries] = useState<string[]>([]);

  // State for existing options from database
  const [existingBusinessTypes, setExistingBusinessTypes] = useState<string[]>(
    []
  );
  const [existingIndustries, setExistingIndustries] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Function to fetch existing business types and industries
  const fetchOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const response = await fetch("/api/business/options");
      const result = await response.json();

      if (result.success) {
        setExistingBusinessTypes(result.data.businessTypes || []);
        setExistingIndustries(result.data.industries || []);
      }
    } catch (error) {
      console.error("Failed to fetch business options:", error);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  // Fetch existing business types and industries when dialog opens
  useEffect(() => {
    if (open) {
      fetchOptions();
    }
  }, [open, fetchOptions]);

  // Dialog states
  const [addBusinessTypeDialog, setAddBusinessTypeDialog] = useState({
    open: false,
    businessTypeName: "",
    error: "",
  });

  const [addIndustryDialog, setAddIndustryDialog] = useState({
    open: false,
    industryName: "",
    error: "",
  });

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.business_name.trim()) {
      newErrors.business_name = "Business name is required";
    }

    if (formData.website && formData.website.trim()) {
      const urlRegex =
        /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlRegex.test(formData.website.trim())) {
        newErrors.website = "Please enter a valid website URL";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler for business type select change
  const handleBusinessTypeSelectChange = (value: string) => {
    if (value === ADD_BUSINESS_TYPE_SELECT_VALUE) {
      // Check if user is admin before allowing to add business type
      if (!isAdmin) {
        toast.error("Only administrators can add business types");
        return;
      }
      setAddBusinessTypeDialog({
        open: true,
        businessTypeName: "",
        error: "",
      });
      return;
    }
    handleChange("business_type", value);
  };

  // Handler for adding business type
  const handleAddBusinessType = () => {
    // Check if user is admin
    if (!isAdmin) {
      toast.error("Only administrators can add business types");
      setAddBusinessTypeDialog({
        open: false,
        businessTypeName: "",
        error: "",
      });
      return;
    }

    const businessTypeName = addBusinessTypeDialog.businessTypeName.trim();

    if (!businessTypeName) {
      setAddBusinessTypeDialog((prev) => ({
        ...prev,
        error: "Business type name is required",
      }));
      return;
    }

    // Check if already exists in existing options
    const existsInExisting = existingBusinessTypes.some(
      (type) => type.toLowerCase() === businessTypeName.toLowerCase()
    );

    // Check if already exists in custom options
    const existsInCustom = customBusinessTypes.some(
      (type) => type.toLowerCase() === businessTypeName.toLowerCase()
    );

    if (existsInExisting || existsInCustom) {
      setAddBusinessTypeDialog((prev) => ({
        ...prev,
        error: "This business type already exists",
      }));
      return;
    }

    // Add to custom business types list
    setCustomBusinessTypes((prev) => [...prev, businessTypeName]);

    // Add to form data
    handleChange("business_type", businessTypeName);
    toast.success("Business type added successfully!");
    setAddBusinessTypeDialog({
      open: false,
      businessTypeName: "",
      error: "",
    });
  };

  // Handler for industry select change
  const handleIndustrySelectChange = (value: string) => {
    if (value === ADD_INDUSTRY_SELECT_VALUE) {
      // Check if user is admin before allowing to add industry
      if (!isAdmin) {
        toast.error("Only administrators can add industries");
        return;
      }
      setAddIndustryDialog({
        open: true,
        industryName: "",
        error: "",
      });
      return;
    }
    handleChange("industry", value);
  };

  // Handler for adding industry
  const handleAddIndustry = () => {
    // Check if user is admin
    if (!isAdmin) {
      toast.error("Only administrators can add industries");
      setAddIndustryDialog({
        open: false,
        industryName: "",
        error: "",
      });
      return;
    }

    const industryName = addIndustryDialog.industryName.trim();

    if (!industryName) {
      setAddIndustryDialog((prev) => ({
        ...prev,
        error: "Industry name is required",
      }));
      return;
    }

    // Check if already exists in existing options
    const existsInExisting = existingIndustries.some(
      (ind) => ind.toLowerCase() === industryName.toLowerCase()
    );

    // Check if already exists in custom options
    const existsInCustom = customIndustries.some(
      (ind) => ind.toLowerCase() === industryName.toLowerCase()
    );

    if (existsInExisting || existsInCustom) {
      setAddIndustryDialog((prev) => ({
        ...prev,
        error: "This industry already exists",
      }));
      return;
    }

    // Add to custom industries list
    setCustomIndustries((prev) => [...prev, industryName]);

    // Add to form data
    handleChange("industry", industryName);
    toast.success("Industry added successfully!");
    setAddIndustryDialog({
      open: false,
      industryName: "",
      error: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      const payload: BusinessInsert = {
        business_name: formData.business_name.trim() || null,
        business_type: formData.business_type || null,
        industry: formData.industry || null,
        business_contact: formData.business_contact.trim() || null,
        business_size: formData.business_size || null,
        business_country: formData.business_country.trim() || null,
        website: formData.website.trim() || null,
        description: formData.description.trim() || null,
        account_owner: formData.account_owner.trim() || null,
        business_address: formData.business_address.trim() || null,
      };

      await createBusinessMutation.mutateAsync(payload);
      toast.success("Business created successfully!");
      // Reset form and close dialog
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setCustomBusinessTypes([]);
      setCustomIndustries([]);
      // Refresh options to include newly created business type and industry
      await fetchOptions();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create business");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-muted-foreground/20 pb-4">
            <DialogTitle>Add Business</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business_name">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                    <Input
                      id="business_name"
                      value={formData.business_name}
                      onChange={(e) =>
                        handleChange("business_name", e.target.value)
                      }
                      placeholder="Enter business name"
                      className={`pl-10 bg-gray-100 ${
                        errors.business_name
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }`}
                    />
                  </div>
                  {errors.business_name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.business_name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={handleBusinessTypeSelectChange}
                    disabled={loadingOptions}
                  >
                    <SelectTrigger className="bg-gray-100">
                      <SelectValue
                        placeholder={
                          loadingOptions ? "Loading..." : "Select business type"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show existing business types from database */}
                      {existingBusinessTypes.map((type) => (
                        <SelectItem key={`existing-${type}`} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                      {/* Show custom business types */}
                      {customBusinessTypes.map((type) => (
                        <SelectItem key={`custom-${type}`} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                      {/* Only show "Add Business Type" option if user is admin */}
                      {isAdmin &&
                        (existingBusinessTypes.length > 0 ||
                          customBusinessTypes.length > 0) && (
                          <div className="my-1 border-t border-muted-foreground/20" />
                        )}
                      {isAdmin && (
                        <SelectItem
                          value={ADD_BUSINESS_TYPE_SELECT_VALUE}
                          className="text-sm text-muted-foreground"
                        >
                          + Add Business Type
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={handleIndustrySelectChange}
                    disabled={loadingOptions}
                  >
                    <SelectTrigger className="bg-gray-100">
                      <SelectValue
                        placeholder={
                          loadingOptions ? "Loading..." : "Select industry"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show existing industries from database */}
                      {existingIndustries.map((industry) => (
                        <SelectItem
                          key={`existing-${industry}`}
                          value={industry}
                        >
                          {industry}
                        </SelectItem>
                      ))}
                      {/* Show custom industries */}
                      {customIndustries.map((industry) => (
                        <SelectItem key={`custom-${industry}`} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                      {/* Only show "Add Industry" option if user is admin */}
                      {isAdmin &&
                        (existingIndustries.length > 0 ||
                          customIndustries.length > 0) && (
                          <div className="my-1 border-t border-muted-foreground/20" />
                        )}
                      {isAdmin && (
                        <SelectItem
                          value={ADD_INDUSTRY_SELECT_VALUE}
                          className="text-sm text-muted-foreground"
                        >
                          + Add Industry
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_size">Business Size</Label>
                  <Select
                    value={formData.business_size}
                    onValueChange={(value) =>
                      handleChange("business_size", value)
                    }
                  >
                    <SelectTrigger className="bg-gray-100">
                      <SelectValue placeholder="Select business size" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business_contact">Business Contact</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                    <Input
                      id="business_contact"
                      type="number"
                      value={formData.business_contact}
                      onChange={(e) =>
                        handleChange("business_contact", e.target.value)
                      }
                      placeholder="Enter contact number"
                      className="pl-10 bg-gray-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_address">Business Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="business_address"
                      value={formData.business_address}
                      onChange={(e) =>
                        handleChange("business_address", e.target.value)
                      }
                      placeholder="Enter full business address"
                      className="pl-10 bg-gray-100 "
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Location Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business_country">Country</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                    <Input
                      id="business_country"
                      value={formData.business_country}
                      onChange={(e) =>
                        handleChange("business_country", e.target.value)
                      }
                      placeholder="Enter country"
                      className="pl-10 bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter business description"
                  className="bg-gray-100 min-h-[120px]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4">
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData(INITIAL_FORM_DATA);
                  setErrors({});
                  setCustomBusinessTypes([]);
                  setCustomIndustries([]);
                }}
              >
                Reset
              </Button> */}
              <Button type="submit" disabled={createBusinessMutation.isPending}>
                {createBusinessMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Business"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Business Type Dialog */}
      <AddBusinessTypeDialog
        open={addBusinessTypeDialog.open}
        onOpenChange={(open) =>
          setAddBusinessTypeDialog((prev) => ({ ...prev, open }))
        }
        businessTypeName={addBusinessTypeDialog.businessTypeName}
        onBusinessTypeNameChange={(name) =>
          setAddBusinessTypeDialog((prev) => ({
            ...prev,
            businessTypeName: name,
            error: "",
          }))
        }
        error={addBusinessTypeDialog.error}
        onAdd={handleAddBusinessType}
        isAdding={false}
      />

      {/* Add Industry Dialog */}
      <AddIndustryDialog
        open={addIndustryDialog.open}
        onOpenChange={(open) =>
          setAddIndustryDialog((prev) => ({ ...prev, open }))
        }
        industryName={addIndustryDialog.industryName}
        onIndustryNameChange={(name) =>
          setAddIndustryDialog((prev) => ({
            ...prev,
            industryName: name,
            error: "",
          }))
        }
        error={addIndustryDialog.error}
        onAdd={handleAddIndustry}
        isAdding={false}
      />
    </>
  );
}

"use client";

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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  AlertCircle,
  Flag,
  Building2,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/common/country-select";
import type { FormData } from "@/lib/constants/sales-leads";
import type { LeadPriority } from "@/lib/data/lead-priorities";
import type { ContactPlatform } from "@/lib/data/contact-platforms";
import {
  NO_SELECTION_VALUE,
  ADD_BUSINESS_SELECT_VALUE,
} from "@/lib/constants/sales-leads";
import { ADD_PLATFORM_SELECT_VALUE } from "@/lib/utils/sales-lead-utils";
import {
  resolvePriorityColor,
  buildContactLabel,
} from "@/lib/utils/sales-lead-utils";

export interface SalesLeadFormFieldsProps {
  data: FormData;
  errors: Record<keyof FormData, string>;
  onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onPlatformSelectChange: (value: string) => void;
  onPrioritySelectChange: (value: string) => void;
  onContactSelectChange: (value: string) => void;
  platformOptions: ContactPlatform[];
  priorityOptions: LeadPriority[];
  contactOptions: any[];
  platformsLoading: boolean;
  businessOptions?: Array<{ id: string; business_name: string | null }>;
  businessesLoading?: boolean;
  onBusinessSelectChange?: (value: string) => void;
  onAddBusinessClick?: () => void;
}

export function SalesLeadFormFields({
  data,
  errors: formErrors,
  onChange,
  onPlatformSelectChange,
  onPrioritySelectChange,
  onContactSelectChange,
  platformOptions,
  priorityOptions,
  contactOptions,
  platformsLoading,
  businessOptions = [],
  businessesLoading = false,
  onBusinessSelectChange,
  onAddBusinessClick,
}: SalesLeadFormFieldsProps) {
  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="firstName"
                  value={data.firstName}
                  onChange={(event) =>
                    onChange("firstName", event.target.value)
                  }
                  placeholder="John"
                  className={`pl-10 bg-gray-100 ${
                    formErrors.firstName
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.firstName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.firstName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="lastName"
                  value={data.lastName}
                  onChange={(event) => onChange("lastName", event.target.value)}
                  placeholder="Doe"
                  className={`pl-10 bg-gray-100 ${
                    formErrors.lastName
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.lastName && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(event) => onChange("email", event.target.value)}
                  placeholder="john.doe@example.com"
                  className={`pl-10 bg-gray-100 ${
                    formErrors.email
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternativeEmail">Alternative Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="alternativeEmail"
                  type="email"
                  value={data.alternativeEmail}
                  onChange={(event) =>
                    onChange("alternativeEmail", event.target.value)
                  }
                  placeholder="alt.email@example.com"
                  className={`pl-10 bg-gray-100 ${
                    formErrors.alternativeEmail
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.alternativeEmail && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.alternativeEmail}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={data.phoneNumber}
                  onChange={(event) => {
                    const value = event.target.value;
                    const digitsOnly = value.replace(/\D/g, "");
                    const limitedDigits = digitsOnly.slice(0, 15);
                    onChange("phoneNumber", limitedDigits);
                  }}
                  placeholder="1234567890"
                  maxLength={10}
                  className={`pl-10 bg-gray-100 ${
                    formErrors.phoneNumber
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.phoneNumber && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.phoneNumber}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternativePhoneNumber">
                Alternative Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
                <Input
                  id="alternativePhoneNumber"
                  type="tel"
                  value={data.alternativePhoneNumber}
                  onChange={(event) => {
                    const value = event.target.value;
                    const digitsOnly = value.replace(/\D/g, "");
                    const limitedDigits = digitsOnly.slice(0, 15);
                    onChange("alternativePhoneNumber", limitedDigits);
                  }}
                  placeholder="1234567890"
                  maxLength={10}
                  className={`pl-10 bg-gray-100 ${
                    formErrors.alternativePhoneNumber
                      ? "border-red-500 focus:border-red-500"
                      : ""
                  }`}
                />
              </div>
              {formErrors.alternativePhoneNumber && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.alternativePhoneNumber}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Select country</Label>
              <CountrySelect
                value={data.location}
                onValueChange={(value) => onChange("location", value)}
                placeholder="Select country"
                error={!!formErrors.location}
              />
              {formErrors.location && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.location}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessId">Business</Label>
              {businessOptions.length === 0 && !businessesLoading ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground mb-2">
                    No businesses available
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onAddBusinessClick}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Business
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2 z-10" />
                  <Select
                    value={data.businessId}
                    onValueChange={onBusinessSelectChange}
                    disabled={businessesLoading}
                  >
                    <SelectTrigger className="bg-gray-100 pl-10 pr-10">
                      <SelectValue
                        placeholder={
                          businessesLoading
                            ? "Loading businesses..."
                            : businessOptions.length === 0
                            ? "No businesses available"
                            : "Select a business"
                        }
                      />
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {businessOptions.length > 0 ? (
                        <>
                          <div className="max-h-[250px] overflow-y-auto">
                            {businessOptions.map((business) => (
                              <SelectItem
                                key={business.id}
                                value={business.id}
                                className="hover:bg-gray-200 hover:text-black"
                              >
                                {business.business_name ||
                                  `Business ${business.id}`}
                              </SelectItem>
                            ))}
                          </div>
                          <div className="sticky bottom-0 bg-popover border-t border-muted-foreground/20 -mx-1 px-1">
                            <SelectItem
                              value={ADD_BUSINESS_SELECT_VALUE}
                              className="text-sm hover:bg-gray-200 hover:text-black cursor-pointer"
                            >
                              + Add Business
                            </SelectItem>
                          </div>
                        </>
                      ) : (
                        <SelectItem value="no-businesses" disabled>
                          No businesses available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {formErrors.businessId && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.businessId}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessLinkedin">Business LinkedIn</Label>
              <Input
                id="businessLinkedin"
                type="url"
                value={data.businessLinkedin}
                onChange={(event) =>
                  onChange("businessLinkedin", event.target.value)
                }
                placeholder="https://linkedin.com/company/companyname"
                className="bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={data.linkedinUrl}
                onChange={(event) =>
                  onChange("linkedinUrl", event.target.value)
                }
                placeholder="https://linkedin.com/in/username"
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={data.priorityId}
                onValueChange={onPrioritySelectChange}
                disabled={priorityOptions.length === 0}
              >
                <SelectTrigger className="bg-gray-100">
                  {data.priorityId && data.priorityId !== NO_SELECTION_VALUE ? (
                    (() => {
                      const selectedPriority = priorityOptions.find(
                        (p) => p.id === data.priorityId
                      );
                      if (selectedPriority) {
                        const priorityColor = resolvePriorityColor(
                          selectedPriority.name,
                          selectedPriority.color
                        );
                        return (
                          <div className="flex items-center gap-2 w-full">
                            <Flag
                              className="h-3 w-3"
                              style={{ color: priorityColor }}
                            />
                            <span>{selectedPriority.name}</span>
                          </div>
                        );
                      }
                      return (
                        <SelectValue
                          placeholder={
                            priorityOptions.length === 0
                              ? "No priorities"
                              : "Select priority"
                          }
                        />
                      );
                    })()
                  ) : (
                    <SelectValue
                      placeholder={
                        priorityOptions.length === 0
                          ? "No priorities"
                          : "Select priority"
                      }
                    />
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION_VALUE}>
                    No priority
                  </SelectItem>
                  {priorityOptions.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id}>
                      <div className="flex items-center gap-2">
                        <Flag
                          className="h-3 w-3"
                          style={{
                            color: resolvePriorityColor(
                              priority.name,
                              priority.color
                            ),
                          }}
                        />
                        <span>{priority.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformId">Lead Platform</Label>
              <Select
                value={data.platformId}
                onValueChange={onPlatformSelectChange}
                disabled={platformsLoading}
              >
                <SelectTrigger className="bg-gray-100">
                  <SelectValue
                    placeholder={
                      platformsLoading
                        ? "Loading platforms..."
                        : platformOptions.length === 0
                        ? "No saved platforms"
                        : "Select a platform"
                    }
                  />
                  <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION_VALUE}>
                    No platform
                  </SelectItem>
                  {platformOptions.length > 0 ? (
                    platformOptions.map((platform) => (
                      <SelectItem
                        key={platform.id ?? `platform-${platform.name}`}
                        value={
                          platform.id !== null
                            ? String(platform.id)
                            : platform.name
                        }
                      >
                        {platform.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-platforms" disabled>
                      No saved platforms
                    </SelectItem>
                  )}
                  <div className="my-1 border-t border-muted-foreground/20" />
                  <SelectItem
                    value={ADD_PLATFORM_SELECT_VALUE}
                    className="text-sm text-muted-foreground"
                  >
                    + Add platform
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                value={data.comment}
                onChange={(event) => onChange("comment", event.target.value)}
                placeholder="Additional notes or comments..."
                rows={4}
                className="bg-gray-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

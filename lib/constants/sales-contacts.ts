import type { SalesContactInsert } from "@/lib/data/sales-contacts";

export type StatusOptionValue = NonNullable<SalesContactInsert["status"]>;

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
  contactTimeZone: string;
  platformId: string;
  platformCustom: string;
  status: StatusOptionValue;
  alternativeEmail: string;
  alternativePhoneNumber: string;
  businessContact: string;
  businessLinkedin: string;
  businessName: string;
  comment: string;
  linkedinUrl: string;
  businessId: string;
}

export const INITIAL_FORM_STATE: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  location: "",
  contactTimeZone: "",
  platformId: "",
  platformCustom: "",
  status: "pending",
  alternativeEmail: "",
  alternativePhoneNumber: "",
  businessContact: "",
  businessLinkedin: "",
  businessName: "",
  comment: "",
  linkedinUrl: "",
  businessId: "",
};

export const INITIAL_FORM_ERRORS: Record<keyof FormData, string> = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  location: "",
  contactTimeZone: "",
  platformId: "",
  platformCustom: "",
  status: "",
  alternativeEmail: "",
  alternativePhoneNumber: "",
  businessContact: "",
  businessLinkedin: "",
  businessName: "",
  comment: "",
  linkedinUrl: "",
  businessId: "",
};

export const STATUS_OPTIONS: Array<{
  value: StatusOptionValue;
  label: string;
}> = [
  { value: "pending", label: "Pending" },
  { value: "moved_to_lead", label: "Moved to Lead" },
  { value: "rejected", label: "Rejected" },
];

export const CONTACT_STATUS_STYLE_MAP: Record<StatusOptionValue, string> = {
  pending: "bg-blue-100 text-blue-700",
  moved_to_lead: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

export const ADD_PLATFORM_SELECT_VALUE = "__add_new_platform__";
export const ADD_BUSINESS_SELECT_VALUE = "__add_new_business__";

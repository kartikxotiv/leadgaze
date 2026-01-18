import type { SalesLeadInsert } from "@/lib/data/sales-leads";

export type StatusOptionValue = NonNullable<SalesLeadInsert["status"]>;

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
  priorityId: string;
  contactId: string;
  ownerId: string;
  alternativeEmail: string;
  alternativePhoneNumber: string;
  linkedinUrl: string;
  businessName: string;
  businessLinkedin: string;
  businessContact: string;
  comment: string;
  businessId: string;
}

export const NO_SELECTION_VALUE = "__none__";

export const INITIAL_FORM_STATE: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  location: "",
  contactTimeZone: "",
  platformId: NO_SELECTION_VALUE,
  platformCustom: "",
  status: "opportunities",
  priorityId: NO_SELECTION_VALUE,
  contactId: NO_SELECTION_VALUE,
  ownerId: NO_SELECTION_VALUE,
  alternativeEmail: "",
  alternativePhoneNumber: "",
  linkedinUrl: "",
  businessName: "",
  businessLinkedin: "",
  businessContact: "",
  comment: "",
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
  priorityId: "",
  contactId: "",
  ownerId: "",
  alternativeEmail: "",
  alternativePhoneNumber: "",
  linkedinUrl: "",
  businessName: "",
  businessLinkedin: "",
  businessContact: "",
  comment: "",
  businessId: "",
};

export const STATUS_OPTIONS: Array<{
  value: StatusOptionValue;
  label: string;
}> = [
  { value: "opportunities", label: "Opportunities" },
  { value: "in_progress", label: "In Progress" },
  { value: "qualified_lead", label: "Qualified Lead" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const STATUS_STYLE_MAP: Record<StatusOptionValue, string> = {
  opportunities: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  qualified_lead: "bg-purple-100 text-purple-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
};

export const ADD_BUSINESS_SELECT_VALUE = "__add_new_business__";

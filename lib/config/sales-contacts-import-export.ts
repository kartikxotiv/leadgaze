import type { FieldDefinition } from "@/components/reuseableComponent/bulk-import-export-dialog";

export const importFields: FieldDefinition[] = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "phoneNumber", label: "Phone Number", required: false },
  { key: "location", label: "Location", required: false },
  { key: "alternativeEmail", label: "Alternative Email", required: false },
  {
    key: "alternativePhoneNumber",
    label: "Alternative Phone Number",
    required: false,
  },
  { key: "businessName", label: "Business Name", required: false },
  { key: "businessLinkedin", label: "Business LinkedIn", required: false },
  { key: "businessContact", label: "Business Contact", required: false },
  { key: "linkedinUrl", label: "LinkedIn URL", required: false },
  { key: "comment", label: "Comment", required: false },
  { key: "status", label: "Status", required: false },
  { key: "platform", label: "Platform", required: false },
];

export const exportFields: FieldDefinition[] = [
  { key: "first_name", label: "First Name", required: false },
  { key: "last_name", label: "Last Name", required: false },
  { key: "email", label: "Email", required: false },
  { key: "phone_number", label: "Phone Number", required: false },
  { key: "location", label: "Location", required: false },
  { key: "alternative_email", label: "Alternative Email", required: false },
  {
    key: "alternative_phone_number",
    label: "Alternative Phone Number",
    required: false,
  },
  { key: "business_name", label: "Business Name", required: false },
  { key: "business_linkedin", label: "Business LinkedIn", required: false },
  { key: "business_contact", label: "Business Contact", required: false },
  { key: "linkedin_url", label: "LinkedIn URL", required: false },
  { key: "comment", label: "Comment", required: false },
  { key: "status", label: "Status", required: false },
  { key: "platform_label", label: "Platform", required: false },
];

export const importSampleData = [
  [
    "John",
    "Doe",
    "john.doe@example.com",
    "1234567890",
    "New York, USA",
    "alt.john@example.com",
    "9876543210",
    "Acme Corp",
    "https://linkedin.com/company/acme",
    "Jane Smith",
    "https://linkedin.com/in/johndoe",
    "Interested in product",
    "pending",
    "LinkedIn",
  ],
  [
    "Jane",
    "Smith",
    "jane.smith@techcorp.com",
    "2345678901",
    "San Francisco, CA",
    "",
    "",
    "TechCorp Inc",
    "https://linkedin.com/company/techcorp",
    "Mike Johnson",
    "https://linkedin.com/in/janesmith",
    "Need follow up",
    "pending",
    "Website",
  ],
];

export function exportDataTransform(row: any) {
  return [
    row.first_name || "",
    row.last_name || "",
    row.email || "",
    row.phone_number || "",
    row.location || "",
    row.alternative_email || "",
    row.alternative_phone_number || "",
    row.business_name || "",
    row.business_linkedin || "",
    row.business_contact || "",
    row.linkedin_url || "",
    row.comment || "",
    row.status_label || "",
    row.platform_label || "",
  ];
}

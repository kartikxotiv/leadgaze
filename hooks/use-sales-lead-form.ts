import { useCallback, useState } from "react";
import {
  type FormData,
  type StatusOptionValue,
  INITIAL_FORM_STATE,
  INITIAL_FORM_ERRORS,
  NO_SELECTION_VALUE,
} from "@/lib/constants/sales-leads";
import { formatPhoneNumber } from "@/lib/utils/sales-lead-utils";

export function useSalesLeadForm() {
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM_STATE });
  const [errors, setErrors] = useState<Record<keyof FormData, string>>({
    ...INITIAL_FORM_ERRORS,
  });
  const [editFormData, setEditFormData] = useState<FormData>({
    ...INITIAL_FORM_STATE,
  });
  const [editErrors, setEditErrors] = useState<Record<keyof FormData, string>>({
    ...INITIAL_FORM_ERRORS,
  });

  const validateField = useCallback(
    (fieldName: keyof FormData, value: string) => {
      switch (fieldName) {
        case "firstName":
          return !value.trim() ? "First name is required" : "";
        case "lastName":
          return !value.trim() ? "Last name is required" : "";
        case "email":
          if (!value.trim()) {
            return "Email is required";
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value.trim())
            ? ""
            : "Please enter a valid email";
        case "phoneNumber":
          if (!value.trim()) {
            return "Phone number is required";
          }
          const digits = value.replace(/\D/g, "");
          if (digits.length !== 10) {
            return "Phone number must be exactly 10 digits";
          }
          return "";
        case "location":
          if (value && value.trim()) {
            const locationRegex = /^[a-zA-Z\s,\-]+$/;
            if (!locationRegex.test(value.trim())) {
              return "Location can only contain letters, spaces, commas, and hyphens";
            }
          }
          return "";
        default:
          return "";
      }
    },
    []
  );

  const buildValidationErrors = useCallback(
    (data: FormData) => {
      const newErrors: Record<keyof FormData, string> = {
        firstName: validateField("firstName", data.firstName),
        lastName: validateField("lastName", data.lastName),
        email: validateField("email", data.email),
        phoneNumber: validateField("phoneNumber", data.phoneNumber),
        location: validateField("location", data.location),
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
      return newErrors;
    },
    [validateField]
  );

  const handleFormChange = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [errors]
  );

  const handleEditFormChange = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setEditFormData((prev) => ({ ...prev, [field]: value }));
      if (editErrors[field]) {
        setEditErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [editErrors]
  );

  const validateForm = useCallback(() => {
    const allErrors = buildValidationErrors(formData);
    const filteredErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([, value]) => value !== "")
    ) as Record<keyof FormData, string>;

    if (Object.keys(filteredErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...allErrors }));
      return false;
    }
    return true;
  }, [buildValidationErrors, formData]);

  const validateEditForm = useCallback(() => {
    const newErrors: Record<keyof FormData, string> = {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      location: validateField("location", editFormData.location),
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

    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([, value]) => value !== "")
    ) as Record<keyof FormData, string>;

    if (Object.keys(filteredErrors).length > 0) {
      setEditErrors((prev) => ({ ...prev, ...newErrors }));
      return false;
    }
    return true;
  }, [editFormData.location, validateField]);

  const resetFormState = useCallback(() => {
    setFormData(() => ({ ...INITIAL_FORM_STATE }));
    setErrors(() => ({ ...INITIAL_FORM_ERRORS }));
  }, []);

  const resetEditFormState = useCallback(() => {
    setEditFormData(() => ({ ...INITIAL_FORM_STATE }));
    setEditErrors(() => ({ ...INITIAL_FORM_ERRORS }));
  }, []);

  const mapLeadToFormData = useCallback((lead: any): FormData => {
    if (!lead) {
      return { ...INITIAL_FORM_STATE };
    }

    return {
      firstName: lead.first_name ?? "",
      lastName: lead.last_name ?? "",
      email: lead.email ?? "",
      phoneNumber: formatPhoneNumber(lead.phone_number),
      location: lead.location ?? "",
      contactTimeZone: lead.contact_time_zone ?? "",
      platformId:
        lead.platform !== undefined && lead.platform !== null
          ? String(lead.platform)
          : NO_SELECTION_VALUE,
      platformCustom: "",
      status: (lead.status as StatusOptionValue) ?? "opportunities",
      priorityId: lead.priority ?? NO_SELECTION_VALUE,
      contactId: lead.contact_id ?? NO_SELECTION_VALUE,
      ownerId: lead.owner_id ?? NO_SELECTION_VALUE,
      alternativeEmail: lead.alternative_email ?? "",
      alternativePhoneNumber: lead.alternative_phone_number ?? "",
      linkedinUrl: lead.linkedin_url ?? "",
      businessName: lead.business_name ?? "",
      businessLinkedin: lead.business_linkedin ?? "",
      businessContact: lead.business_contact ?? "",
      comment: lead.comment ?? "",
      businessId: lead.business_id ?? "",
    };
  }, []);

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    editFormData,
    setEditFormData,
    editErrors,
    setEditErrors,
    handleFormChange,
    handleEditFormChange,
    validateForm,
    validateEditForm,
    resetFormState,
    resetEditFormState,
    mapLeadToFormData,
  };
}

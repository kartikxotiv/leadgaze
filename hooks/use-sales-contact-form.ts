import { useCallback, useState } from "react";
import {
  type FormData,
  type StatusOptionValue,
  INITIAL_FORM_STATE,
  INITIAL_FORM_ERRORS,
} from "@/lib/constants/sales-contacts";

export function useSalesContactForm() {
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
          // Remove common phone number characters for validation
          const digits = value.replace(/\D/g, "");
          // Phone must have exactly 10 digits
          if (digits.length !== 10) {
            return "Phone number must be exactly 10 digits";
          }
          return "";
        case "alternativeEmail":
          // Alternative email is optional, but if provided, must be valid
          if (value && value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value.trim())) {
              return "Please enter a valid email address";
            }
          }
          return "";
        case "alternativePhoneNumber":
          // Alternative phone number is optional, but if provided, must be exactly 10 digits
          if (value && value.trim()) {
            const digits = value.replace(/\D/g, "");
            if (digits.length !== 10) {
              return "Phone number must be exactly 10 digits";
            }
          }
          return "";
        case "location":
          // Location is optional, but if provided, should only contain alphabets, spaces, commas, and hyphens
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
        alternativeEmail: validateField(
          "alternativeEmail",
          data.alternativeEmail
        ),
        alternativePhoneNumber: validateField(
          "alternativePhoneNumber",
          data.alternativePhoneNumber
        ),
        businessContact: validateField("businessContact", data.businessContact),
        businessLinkedin: validateField(
          "businessLinkedin",
          data.businessLinkedin
        ),
        businessName: validateField("businessName", data.businessName),
        comment: validateField("comment", data.comment),
        linkedinUrl: validateField("linkedinUrl", data.linkedinUrl),
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
    const allErrors = buildValidationErrors(editFormData);
    const filteredErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([, value]) => value !== "")
    ) as Record<keyof FormData, string>;

    if (Object.keys(filteredErrors).length > 0) {
      setEditErrors((prev) => ({ ...prev, ...allErrors }));
      return false;
    }
    return true;
  }, [buildValidationErrors, editFormData]);

  const resetFormState = useCallback(() => {
    setFormData(() => ({ ...INITIAL_FORM_STATE }));
    setErrors(() => ({ ...INITIAL_FORM_ERRORS }));
  }, []);

  const resetEditFormState = useCallback(() => {
    setEditFormData(() => ({ ...INITIAL_FORM_STATE }));
    setEditErrors(() => ({ ...INITIAL_FORM_ERRORS }));
  }, []);

  const mapContactToFormData = useCallback((contact: any): FormData => {
    if (!contact) {
      return { ...INITIAL_FORM_STATE };
    }

    return {
      firstName: contact.first_name ?? "",
      lastName: contact.last_name ?? "",
      email: contact.email ?? "",
      phoneNumber: contact.phone_number ?? "",
      location: contact.location ?? "",
      contactTimeZone: contact.contact_time_zone ?? "",
      platformId:
        contact.platform !== undefined && contact.platform !== null
          ? String(contact.platform)
          : "",
      platformCustom: "",
      status: (contact.status as StatusOptionValue) ?? "pending",

      alternativeEmail: contact.alternative_email ?? "",
      alternativePhoneNumber: contact.alternative_phone_number ?? "",
      businessContact: contact.business_contact ?? "",
      businessLinkedin: contact.business_linkedin ?? "",
      businessName: contact.business_name ?? "",
      comment: contact.comment ?? "",
      linkedinUrl: contact.linkedin_url ?? "",
      businessId: contact.business_id ?? "",
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
    mapContactToFormData,
  };
}

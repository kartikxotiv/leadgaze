import { LEAD_DB_COLUMN_TO_FIELD_KEY } from './lead-system-fields';

/** Form / API payload key → FLS field_key */
const FORM_KEY_TO_FIELD_KEY: Record<string, string> = {
  ...LEAD_DB_COLUMN_TO_FIELD_KEY,
};

export function formFieldToPermissionKey(formKey: string): string {
  return FORM_KEY_TO_FIELD_KEY[formKey] ?? formKey;
}

export function canShowFormField(
  formKey: string,
  canEdit: (fieldKey: string) => boolean,
): boolean {
  return canEdit(formFieldToPermissionKey(formKey));
}

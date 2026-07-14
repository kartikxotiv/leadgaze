import { ACCOUNT_DB_COLUMN_TO_FIELD_KEY } from './accounts-system-fields';
import { CONTACT_DB_COLUMN_TO_FIELD_KEY } from './contacts-system-fields';
import { LEAD_DB_COLUMN_TO_FIELD_KEY } from './lead-system-fields';
import { OPPORTUNITY_DB_COLUMN_TO_FIELD_KEY } from './opportunities-system-fields';
import {
  CUSTOMER_DB_COLUMN_TO_FIELD_KEY,
  ORGANIZATION_DB_COLUMN_TO_FIELD_KEY,
  TICKET_DB_COLUMN_TO_FIELD_KEY,
} from './service-cloud-system-fields';

/** Form / API payload key → FLS field_key */
const FORM_KEY_TO_FIELD_KEY: Record<string, string> = {
  ...LEAD_DB_COLUMN_TO_FIELD_KEY,
  ...CONTACT_DB_COLUMN_TO_FIELD_KEY,
  ...ACCOUNT_DB_COLUMN_TO_FIELD_KEY,
  ...OPPORTUNITY_DB_COLUMN_TO_FIELD_KEY,
  ...TICKET_DB_COLUMN_TO_FIELD_KEY,
  ...CUSTOMER_DB_COLUMN_TO_FIELD_KEY,
  ...ORGANIZATION_DB_COLUMN_TO_FIELD_KEY,
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

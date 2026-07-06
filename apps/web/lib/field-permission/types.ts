export type AccessType =
  | 'public'
  | 'private'
  | 'role_based'
  | 'user_based'
  | 'custom';

export interface FieldAccessMember {
  id?: string;
  member_type: 'role' | 'user';
  member_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface EntityFieldDefinition {
  id: string;
  workspace_id: string;
  entity_type: string;
  product_key?: string;
  field_key: string;
  field_label: string;
  field_type: string;
  description: string | null;
  is_system: boolean;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  settings: Record<string, unknown>;
  access_rule?: {
    id: string;
    access_type: AccessType;
  } | null;
  access_members?: FieldAccessMember[];
  created_by?: string | null;
}

export interface FieldPermissionContext {
  workspaceId: string;
  entityType: string;
  productKey: string;
  userId: string;
  roleId: string | null;
  isWorkspaceOwner: boolean;
  isModuleAdmin: boolean;
  hasModuleAccess: boolean;
  fields: EntityFieldDefinition[];
}

export interface VisibleField {
  field_key: string;
  field_label: string;
  field_type: string;
  is_system: boolean;
  can_view: boolean;
  can_edit: boolean;
  display_order: number;
}

export interface LeadWriteValidationResult {
  sanitized: Record<string, unknown>;
  rejected: string[];
}

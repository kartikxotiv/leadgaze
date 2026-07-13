import {
  LEAD_DB_COLUMN_TO_FIELD_KEY,
  LEAD_SYSTEM_FIELD_DEFINITIONS,
} from './lead-system-fields';
import type {
  AccessType,
  EntityFieldDefinition,
  FieldAccessMember,
  FieldPermissionContext,
  LeadWriteValidationResult,
  VisibleField,
} from './types';

// ─── Core evaluation (pure — shared by server + client) ─────────────────────

function isSuperAdminRole(roleKey?: string | null): boolean {
  return roleKey === 'admin' || roleKey === 'owner';
}

function findFieldDefinition(
  fields: EntityFieldDefinition[],
  fieldKey: string,
): EntityFieldDefinition | undefined {
  return fields.find((f) => f.field_key === fieldKey && f.is_active);
}

function evaluateMemberAccess(
  members: FieldAccessMember[],
  userId: string,
  roleId: string | null,
  roleKey: string | null,
  permission: 'can_view' | 'can_edit',
): boolean {
  return members.some((member) => {
    if (member.member_type === 'user' && member.member_id === userId) {
      return member[permission];
    }
    if (
      member.member_type === 'role' &&
      roleId &&
      member.member_id === roleId
    ) {
      return member[permission];
    }
    if (
      member.member_type === 'role' &&
      roleKey &&
      member.member_id === roleKey
    ) {
      return member[permission];
    }
    return false;
  });
}

function evaluateAccessType(
  accessType: AccessType,
  members: FieldAccessMember[] | undefined,
  userId: string,
  roleId: string | null,
  roleKey: string | null,
  permission: 'can_view' | 'can_edit',
  ctx: Pick<FieldPermissionContext, 'isWorkspaceOwner' | 'isModuleAdmin'>,
): boolean {
  switch (accessType) {
    case 'public':
      return true;
    case 'private':
      if (ctx.isWorkspaceOwner || ctx.isModuleAdmin) return true;
      if (!members?.length) return false;
      return evaluateMemberAccess(members, userId, roleId, roleKey, permission);
    case 'role_based':
    case 'custom':
      if (!members?.length) return false;
      return evaluateMemberAccess(members, userId, roleId, roleKey, permission);
    case 'user_based':
      if (!members?.length) return false;
      return members.some(
        (m) =>
          m.member_type === 'user' && m.member_id === userId && m[permission],
      );
    default:
      return false;
  }
}

export function canViewField(
  ctx: FieldPermissionContext,
  fieldKey: string,
): boolean {
  if (!ctx.hasModuleAccess && !ctx.isWorkspaceOwner) return false;
  if (ctx.isWorkspaceOwner) return true;

  const field = findFieldDefinition(ctx.fields, fieldKey);
  if (!field) {
    // Field has no access rule configured → treat as public (visible to all).
    // This covers system fields from all modules (Service Cloud, HRMS, etc.)
    // that are not individually stored in the entity_fields table.
    return true;
  }

  if (field.created_by === ctx.userId) return true;

  const accessType = field.access_rule?.access_type ?? 'public';
  return evaluateAccessType(
    accessType,
    field.access_members,
    ctx.userId,
    ctx.roleId,
    ctx.roleKey,
    'can_view',
    ctx,
  );
}

export function canEditField(
  ctx: FieldPermissionContext,
  fieldKey: string,
): boolean {
  if (!ctx.hasModuleAccess && !ctx.isWorkspaceOwner) return false;
  if (ctx.isWorkspaceOwner) return true;
  if (!canViewField(ctx, fieldKey)) return false;

  const field = findFieldDefinition(ctx.fields, fieldKey);
  if (!field) {
    // Field has no access rule configured → treat as editable by default.
    return true;
  }

  if (field.created_by === ctx.userId) return true;

  const accessType = field.access_rule?.access_type ?? 'public';
  if (accessType === 'public') return true;

  return evaluateAccessType(
    accessType,
    field.access_members,
    ctx.userId,
    ctx.roleId,
    ctx.roleKey,
    'can_edit',
    ctx,
  );
}

export function getVisibleFields(ctx: FieldPermissionContext): VisibleField[] {
  const systemFields: VisibleField[] = LEAD_SYSTEM_FIELD_DEFINITIONS.map(
    (def) => ({
      field_key: def.field_key,
      field_label: def.field_label,
      field_type: def.field_type,
      is_system: true,
      can_view: canViewField(ctx, def.field_key),
      can_edit: canEditField(ctx, def.field_key),
      display_order: def.display_order,
    }),
  );

  const customFields: VisibleField[] = ctx.fields
    .filter((f) => !f.is_system && f.is_active)
    .map((f) => ({
      field_key: f.field_key,
      field_label: f.field_label,
      field_type: f.field_type,
      is_system: false,
      can_view: canViewField(ctx, f.field_key),
      can_edit: canEditField(ctx, f.field_key),
      display_order: f.display_order,
    }));

  return [...systemFields, ...customFields]
    .filter((f) => f.can_view)
    .sort((a, b) => a.display_order - b.display_order);
}

export function getEditableFields(ctx: FieldPermissionContext): VisibleField[] {
  return getVisibleFields(ctx).filter((f) => f.can_edit);
}

// ─── Lead read/write filtering ────────────────────────────────────────────────

type LeadRecord = Record<string, unknown>;

export function filterLeadForRead<T extends LeadRecord>(
  lead: T,
  ctx: FieldPermissionContext,
): T {
  const filtered = { ...lead } as LeadRecord;
  const customFields =
    (filtered.custom_fields as Record<string, unknown> | null) ?? {};

  for (const def of LEAD_SYSTEM_FIELD_DEFINITIONS) {
    if (!canViewField(ctx, def.field_key)) {
      for (const col of def.db_columns) {
        filtered[col] = null;
      }
      for (const rel of def.relation_keys ?? []) {
        filtered[rel] = null;
      }
    }
  }

  const filteredCustom: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(customFields)) {
    if (canViewField(ctx, key)) {
      filteredCustom[key] = value;
    }
  }
  filtered.custom_fields = filteredCustom;

  return filtered as T;
}

export function filterLeadsForRead<T extends LeadRecord>(
  leads: T[],
  ctx: FieldPermissionContext,
): T[] {
  return leads.map((lead) => filterLeadForRead(lead, ctx));
}

const IMMUTABLE_LEAD_KEYS = new Set([
  'id',
  'workspace_id',
  'created_by',
  'created_at',
  'updated_by',
  'updated_at',
  'is_deleted',
  'deleted_at',
  'deleted_by',
]);

export function validateLeadWritePayload(
  body: Record<string, unknown>,
  ctx: FieldPermissionContext,
): LeadWriteValidationResult {
  const sanitized: Record<string, unknown> = {};
  const rejected: string[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (IMMUTABLE_LEAD_KEYS.has(key)) continue;

    if (key === 'custom_fields' && value && typeof value === 'object') {
      const input = value as Record<string, unknown>;
      const allowed: Record<string, unknown> = {};
      for (const [cfKey, cfVal] of Object.entries(input)) {
        if (canEditField(ctx, cfKey)) {
          allowed[cfKey] = cfVal;
        } else {
          rejected.push(`custom_fields.${cfKey}`);
        }
      }
      sanitized.custom_fields = allowed;
      continue;
    }

    const fieldKey = LEAD_DB_COLUMN_TO_FIELD_KEY[key] ?? key;
    if (canEditField(ctx, fieldKey)) {
      sanitized[key] = value;
    } else {
      rejected.push(key);
    }
  }

  return { sanitized, rejected };
}

export function buildFieldPermissionContext(params: {
  workspaceId: string;
  entityType: string;
  productKey: string;
  userId: string;
  roleId: string | null;
  roleKey: string | null;
  isWorkspaceOwner: boolean;
  hasModuleAccess: boolean;
  fields: EntityFieldDefinition[];
}): FieldPermissionContext {
  return {
    workspaceId: params.workspaceId,
    entityType: params.entityType,
    productKey: params.productKey,
    userId: params.userId,
    roleId: params.roleId,
    isWorkspaceOwner: params.isWorkspaceOwner,
    isModuleAdmin: isSuperAdminRole(params.roleKey),
    hasModuleAccess: params.hasModuleAccess,
    fields: params.fields,
  };
}

export function filterExportColumns(
  columns: Array<{ key: string; label: string }>,
  ctx: FieldPermissionContext,
): Array<{ key: string; label: string }> {
  return columns.filter((col) => {
    const fieldKey =
      LEAD_DB_COLUMN_TO_FIELD_KEY[col.key] ??
      LEAD_DB_COLUMN_TO_FIELD_KEY[col.key] ??
      col.key;
    return canViewField(ctx, fieldKey);
  });
}

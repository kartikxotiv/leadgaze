import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@kit/supabase/database';

import { coreDb } from './core-client';
import {
  type FieldPermissionContext,
  buildFieldPermissionContext,
} from './field-permission.service';
import { LEAD_SYSTEM_FIELD_DEFINITIONS } from './lead-system-fields';
import type { EntityFieldDefinition } from './types';

type AppSupabase = SupabaseClient<Database>;

function isMissingFlsTableError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === 'PGRST205' || code === '42P01';
}

export async function seedSystemEntityFields(
  supabase: AppSupabase,
  workspaceId: string,
  entityType: string,
  productKey: string,
): Promise<void> {
  if (entityType !== 'leads') return;

  const core = coreDb(supabase);
  const { data: existing, error: existingError } = await core
    .from('entity_fields')
    .select('field_key')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', entityType)
    .eq('product_key', productKey)
    .eq('is_system', true);

  if (existingError) {
    if (isMissingFlsTableError(existingError)) return;
    throw existingError;
  }

  const existingKeys = new Set((existing ?? []).map((r) => r.field_key));

  const toInsert = LEAD_SYSTEM_FIELD_DEFINITIONS.filter(
    (def) => !existingKeys.has(def.field_key),
  ).map((def) => ({
    workspace_id: workspaceId,
    entity_type: entityType,
    product_key: productKey,
    field_key: def.field_key,
    field_label: def.field_label,
    field_type: def.field_type,
    is_system: true,
    is_required: false,
    is_active: true,
    display_order: def.display_order,
    settings: {},
  }));

  if (toInsert.length === 0) return;

  const { error } = await core.from('entity_fields').insert(toInsert);
  if (error) {
    if (isMissingFlsTableError(error)) {
      console.warn('FLS tables not migrated yet — skipping system field seed');
      return;
    }
    console.error('Failed to seed system entity fields:', error);
    throw error;
  }
}

export async function loadEntityFields(
  supabase: AppSupabase,
  workspaceId: string,
  entityType: string,
  productKey: string,
): Promise<EntityFieldDefinition[]> {
  await seedSystemEntityFields(supabase, workspaceId, entityType, productKey);

  const { data, error } = await coreDb(supabase)
    .from('entity_fields')
    .select(
      `
      *,
      access_rule:field_access_rules(
        id,
        access_type,
        members:field_access_members(
          id,
          member_type,
          member_id,
          can_view,
          can_edit
        )
      )
    `,
    )
    .eq('workspace_id', workspaceId)
    .eq('entity_type', entityType)
    .eq('product_key', productKey)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    if (isMissingFlsTableError(error)) {
      console.warn(
        'FLS tables not migrated yet — returning no field definitions',
      );
      return [];
    }
    throw error;
  }

  // Map nested members to top-level access_members for compatibility with EntityFieldDefinition interface
  return (data ?? []).map((field) => ({
    ...field,
    access_members: field.access_rule?.members || [],
  })) as unknown as EntityFieldDefinition[];
}

export async function loadFieldPermissionContext(
  supabase: AppSupabase,
  params: {
    workspaceId: string;
    entityType: string;
    productKey?: string;
    userId: string;
    moduleKey?: string;
  },
): Promise<FieldPermissionContext> {
  const productKey = params.productKey ?? 'sales';
  const moduleKey = params.moduleKey ?? 'leads';

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', params.workspaceId)
    .single();

  const isWorkspaceOwner = workspace?.owner_id === params.userId;

  const { data: members } = await supabase
    .from('workspace_members')
    .select('role_id, product_key, role:workspace_roles(id, role_key)')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId)
    .eq('status', 'accepted');

  const member = members?.find((m: any) => m.product_key === productKey)
    || members?.find((m: any) => m.product_key === null)
    || members?.[0];

  const roleId = member?.role_id ?? null;
  const roleKey = member?.role?.role_key ?? null;

  let hasModuleAccess = isWorkspaceOwner;

  if (!hasModuleAccess && roleId) {
    const { data: permission } = await supabase
      .from('role_permissions')
      .select(
        `
        can_access,
        crm_module_features!inner(
          feature_key,
          crm_modules!inner(module_key)
        )
      `,
      )
      .eq('role_id', roleId)
      .eq('crm_module_features.feature_key', 'view')
      .eq('crm_module_features.crm_modules.module_key', moduleKey)
      .maybeSingle();

    hasModuleAccess = Boolean(permission?.can_access);
  }

  const fields = await loadEntityFields(
    supabase,
    params.workspaceId,
    params.entityType,
    productKey,
  );

  return buildFieldPermissionContext({
    workspaceId: params.workspaceId,
    entityType: params.entityType,
    productKey,
    userId: params.userId,
    roleId,
    roleKey,
    isWorkspaceOwner,
    hasModuleAccess,
    fields,
  });
}

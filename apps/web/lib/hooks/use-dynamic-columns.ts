'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

import type { Database } from '@kit/supabase/database';
import {
  buildFieldPermissionContext,
  canEditField,
  canViewField,
  getEditableFields,
  getVisibleFields,
} from '~/lib/field-permission';
import { coreDb } from '~/lib/field-permission/core-client';
import { getLeadsMetaService } from '~/services/leads.service';
import { getContactsMetaService } from '~/services/contacts.service';
import { getAccountsMetaService } from '~/services/accounts.service';
import { getOpportunitiesMetaService } from '~/services/opportunities.service';

export type AccessType =
  | 'public'
  | 'private'
  | 'role_based'
  | 'user_based'
  | 'custom';

export interface EntityField {
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
  created_at: string;
  updated_at: string;
  access_rule?: {
    id: string;
    access_type: AccessType;
  } | null;
  access_members?: Array<{
    id: string;
    member_type: 'role' | 'user';
    member_id: string;
    can_view: boolean;
    can_edit: boolean;
  }>;
}

export interface FieldAccessMember {
  id?: string;
  member_type: 'role' | 'user';
  member_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface ColumnPreference {
  visibleColumns: string[];
  columnWidths: Record<string, number>;
  columnOrder: string[];
}

interface UseDynamicColumnsOptions {
  entityType: string;
  workspaceId?: string;
  userId?: string;
  productKey?: string;
  enabled?: boolean;
  staleTime?: number;
}

const META_SUPPORTED_ENTITIES = ['leads', 'contacts', 'accounts', 'opportunities'];

export function useDynamicColumns({
  entityType,
  workspaceId,
  userId,
  productKey = 'sales',
  enabled = true,
  staleTime = 5 * 60 * 1000,
}: UseDynamicColumnsOptions) {
  const supabase = getSupabaseBrowserClient<Database>();
  const queryClient = useQueryClient();

  const isMetaSupported = META_SUPPORTED_ENTITIES.includes(entityType);

  // Pre-fetch Entity Meta for sales entities (leads, contacts, accounts, opportunities)
  const { data: entityMeta, isLoading: entityMetaLoading } = useQuery({
    queryKey: [`${entityType}-meta`, workspaceId, userId, productKey],
    queryFn: () => {
      const params = { workspaceId: workspaceId!, userId: userId!, productKey };
      if (entityType === 'leads') return getLeadsMetaService(params);
      if (entityType === 'contacts') return getContactsMetaService(params);
      if (entityType === 'accounts') return getAccountsMetaService(params);
      if (entityType === 'opportunities') return getOpportunitiesMetaService(params);
      return null;
    },
    enabled: enabled && isMetaSupported && !!workspaceId && !!userId,
    staleTime,
  });

  // Fetch all entity fields from Supabase (fallback for entities not supported by meta API)
  const {
    data: supabaseFields = [],
    isLoading: supabaseFieldsLoading,
    refetch: refetchFields,
  } = useQuery({
    queryKey: ['entity-fields', workspaceId, entityType, productKey],
    queryFn: async () => {
      if (!workspaceId) return [];

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
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('FLS entity_fields table not available');
          return [];
        }
        console.error('Error fetching entity fields:', error);
        throw error;
      }

      // Map nested members to top-level access_members for compatibility with EntityField interface
      return (data ?? []).map((field: any) => ({
        ...field,
        access_members: (Array.isArray(field.access_rule) ? field.access_rule[0]?.members : field.access_rule?.members) || [],
      })) as unknown as EntityField[];
    },
    enabled: enabled && !!workspaceId && !isMetaSupported,
    staleTime,
  });

  const fields = isMetaSupported ? ((entityMeta?.fields as unknown as EntityField[]) || []) : supabaseFields;
  const fieldsLoading = isMetaSupported ? entityMetaLoading : supabaseFieldsLoading;

  // Fetch user column preferences from Supabase (fallback for entities not supported by meta API)
  const { data: supabasePreferences, isLoading: supabasePreferencesLoading } = useQuery({
    queryKey: ['user-column-preferences', workspaceId, userId, entityType],
    queryFn: async () => {
      if (!workspaceId || !userId) return null;

      const { data, error } = await coreDb(supabase)
        .from('user_column_preferences')
        .select('preferences')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          return null;
        }
        console.error('Error fetching column preferences:', error);
        throw error;
      }

      return (data?.preferences as unknown as ColumnPreference) ?? null;
    },
    enabled: enabled && !!workspaceId && !!userId && !isMetaSupported,
    staleTime,
  });

  const preferences = isMetaSupported
    ? ((entityMeta?.preferences?.preferences as unknown as ColumnPreference) ?? null)
    : supabasePreferences;
  const preferencesLoading = isMetaSupported ? entityMetaLoading : supabasePreferencesLoading;

  // Update column preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (newPreferences: Partial<ColumnPreference>) => {
      if (!workspaceId || !userId) {
        throw new Error('Missing workspaceId or userId');
      }

      const { error } = await coreDb(supabase)
        .from('user_column_preferences')
        .upsert(
          {
            workspace_id: workspaceId,
            user_id: userId,
            entity_type: entityType,
            preferences: {
              ...preferences,
              ...newPreferences,
            },
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'workspace_id,user_id,entity_type',
          },
        );

      if (error) {
        console.error('Error updating column preferences:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['user-column-preferences', workspaceId, userId, entityType],
      });
    },
  });

  // Update field access mutation (uses the standalone useUpdateFieldAccess logic inline)
  const updateFieldAccess = useMutation({
    mutationFn: async ({
      fieldId,
      accessType,
      members,
    }: {
      fieldId: string;
      accessType: AccessType;
      members?: FieldAccessMember[];
    }) => {
      // Get workspace_id from field
      const { data: field } = await coreDb(supabase)
        .from('entity_fields')
        .select('workspace_id')
        .eq('id', fieldId)
        .single();

      if (!field) throw new Error('Field not found');

      // Check if access rule exists
      const { data: existingRule } = await coreDb(supabase)
        .from('field_access_rules')
        .select('id')
        .eq('field_id', fieldId)
        .single();

      let ruleId: string;

      if (existingRule) {
        const { error } = await coreDb(supabase)
          .from('field_access_rules')
          .update({ access_type: accessType })
          .eq('id', existingRule.id);
        if (error) throw error;
        ruleId = existingRule.id;
        const { error: deleteError } = await coreDb(supabase)
          .from('field_access_members')
          .delete()
          .eq('field_access_rule_id', ruleId);
        if (deleteError) throw deleteError;
      } else {
        const { data: newRule, error } = await coreDb(supabase)
          .from('field_access_rules')
          .insert({
            workspace_id: field.workspace_id,
            field_id: fieldId,
            access_type: accessType,
          })
          .select()
          .single();
        if (error) throw error;
        ruleId = newRule.id;
      }

      if (members && members.length > 0) {
        const memberInserts = members.map((m) => ({
          workspace_id: field.workspace_id,
          field_access_rule_id: ruleId,
          member_type: m.member_type,
          member_id: m.member_id,
          can_view: m.can_view,
          can_edit: m.can_edit,
        }));
        const { error } = await coreDb(supabase)
          .from('field_access_members')
          .insert(memberInserts);
        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['entity-fields', workspaceId, entityType],
      });
    },
  });

  // Delete field mutation
  const deleteField = useMutation({
    mutationFn: async ({ fieldId }: { fieldId: string }) => {
      const { error } = await coreDb(supabase)
        .from('entity_fields')
        .delete()
        .eq('id', fieldId);
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['entity-fields'],
        exact: false,
      });
      ['leads-meta', 'opportunities-meta', 'contacts-meta', 'accounts-meta'].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key], exact: false });
      });
    },
  });

  return {
    fields,
    preferences,
    updatePreferences,
    updateFieldAccess,
    deleteField,
    refetch: refetchFields,
    isLoading: fieldsLoading || preferencesLoading,
  };
}

// Re-export shared field permission helpers (use useFieldPermissions hook in components)
export {
  canViewField,
  canEditField,
  getVisibleFields,
  getEditableFields,
  buildFieldPermissionContext,
} from '~/lib/field-permission';

// Legacy wrappers — prefer useFieldPermissions hook
export function useCanViewField(
  field: EntityField | null,
  userId?: string,
  userRoles?: string[],
) {
  if (!field) return false;
  const ctx = buildFieldPermissionContext({
    workspaceId: field.workspace_id,
    entityType: field.entity_type,
    productKey: 'sales',
    userId: userId ?? '',
    roleId: userRoles?.[0] ?? null,
    roleKey: null,
    isWorkspaceOwner: false,
    hasModuleAccess: true,
    fields: [field],
  });
  return canViewField(ctx, field.field_key);
}

export function useCanEditField(
  field: EntityField | null,
  userId?: string,
  userRoles?: string[],
) {
  if (!field) return false;
  const ctx = buildFieldPermissionContext({
    workspaceId: field.workspace_id,
    entityType: field.entity_type,
    productKey: 'sales',
    userId: userId ?? '',
    roleId: userRoles?.[0] ?? null,
    roleKey: null,
    isWorkspaceOwner: false,
    hasModuleAccess: true,
    fields: [field],
  });
  return canEditField(ctx, field.field_key);
}

export function useFieldAccess(fieldId: string) {
  return useQuery({
    queryKey: ['field-access', fieldId],
    queryFn: async () => {
      const { data, error } = await coreDb(getSupabaseBrowserClient<Database>())
        .from('field_access_rules')
        .select(
          `
          *,
          members:field_access_members(*)
        `,
        )
        .eq('field_id', fieldId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching field access:', error);
        throw error;
      }

      return data;
    },
  });
}

export function useUpdateFieldAccess() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseBrowserClient<Database>();

  return useMutation({
    mutationFn: async ({
      fieldId,
      accessType,
      members,
    }: {
      fieldId: string;
      accessType: AccessType;
      members?: FieldAccessMember[];
    }) => {
      // Get workspace_id from field
      const { data: field } = await coreDb(supabase)
        .from('entity_fields')
        .select('workspace_id')
        .eq('id', fieldId)
        .single();

      if (!field) throw new Error('Field not found');

      // Check if access rule exists
      const { data: existingRule } = await coreDb(supabase)
        .from('field_access_rules')
        .select('id')
        .eq('field_id', fieldId)
        .single();

      let ruleId: string;

      if (existingRule) {
        // Update existing rule
        const { error } = await coreDb(supabase)
          .from('field_access_rules')
          .update({ access_type: accessType })
          .eq('id', existingRule.id);

        if (error) throw error;
        ruleId = existingRule.id;

        // Delete existing members
        const { error: deleteError } = await coreDb(supabase)
          .from('field_access_members')
          .delete()
          .eq('field_access_rule_id', ruleId);
        if (deleteError) throw deleteError;
      } else {
        // Create new rule
        const { data: newRule, error } = await coreDb(supabase)
          .from('field_access_rules')
          .insert({
            workspace_id: field.workspace_id,
            field_id: fieldId,
            access_type: accessType,
          })
          .select()
          .single();

        if (error) throw error;
        ruleId = newRule.id;
      }

      // Insert new members
      if (members && members.length > 0) {
        const memberInserts = members.map((m) => ({
          workspace_id: field.workspace_id,
          field_access_rule_id: ruleId,
          member_type: m.member_type,
          member_id: m.member_id,
          can_view: m.can_view,
          can_edit: m.can_edit,
        }));

        const { error } = await coreDb(supabase)
          .from('field_access_members')
          .insert(memberInserts);

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['entity-fields'],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['field-access', variables.fieldId],
      });
    },
  });
}

export function useCreateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fieldData: {
      workspace_id: string;
      entity_type: string;
      product_key?: string;
      field_key: string;
      field_label: string;
      field_type: string;
      description?: string;
      is_required?: boolean;
      is_system?: boolean;
      settings?: Record<string, unknown>;
      access_type?: AccessType;
      access_members?: FieldAccessMember[];
    }) => {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldData),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || errorJson.error || 'Failed to create field');
      }

      const responseJson = await res.json();
      return responseJson.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['entity-fields', variables.workspace_id, variables.entity_type],
      });
      // Also invalidate the consolidated *-meta query used by sales entity pages
      // (leads, contacts, accounts, opportunities). Without this, newly created
      // columns only appear after a full page refresh because the meta cache
      // supplies the field list for these entities, not entity-fields directly.
      const metaKey = `${variables.entity_type}-meta`;
      queryClient.invalidateQueries({
        queryKey: [metaKey],
        exact: false,
      });
    },
  });
}

export function useUpdateField() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseBrowserClient<Database>();

  return useMutation({
    mutationFn: async (input: {
      fieldId: string;
      updates: Partial<{
        field_label: string;
        description: string | null;
        is_required: boolean;
        is_active: boolean;
        settings: Record<string, unknown>;
      }>;
    }) => {
      console.debug('useUpdateField.mutationFn called', { input });
      const { data, error } = await coreDb(supabase)
        .from('entity_fields')
        .update(input.updates as any)
        .eq('id', input.fieldId)
        .select()
        .single();

      if (error) throw error;
      console.debug('useUpdateField result', { data });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['entity-fields'],
        exact: false,
      });
      // Invalidate all meta queries for sales entities
      ['leads-meta', 'opportunities-meta', 'contacts-meta', 'accounts-meta'].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key], exact: false });
      });
    },
  });
}

export function useDeleteField() {
  const queryClient = useQueryClient();
  const supabase = getSupabaseBrowserClient<Database>();

  return useMutation({
    mutationFn: async ({ fieldId }: { fieldId: string }) => {
      const { error } = await coreDb(supabase)
        .from('entity_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['entity-fields'],
        exact: false,
      });
      // Invalidate all meta queries for sales entities so deleted columns disappear in real time
      ['leads-meta', 'opportunities-meta', 'contacts-meta', 'accounts-meta'].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key], exact: false });
      });
    },
  });
}

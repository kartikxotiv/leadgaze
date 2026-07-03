'use client';

import React, { useMemo, useState } from 'react';

import { ServiceCloudTicketsPage } from '@kit/service-cloud';
import { AddColumnModal } from '@kit/ui/add-column-modal';
import { ColumnEditModal } from '@kit/ui/column-edit-modal';
import type { ColumnEditFieldShape } from '@kit/ui/column-edit-modal';

import {
  type EntityField,
  useCreateField,
  useDynamicColumns,
  useUpdateField,
} from '~/lib/hooks/use-dynamic-columns';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useTeamMembers } from '~/lib/hooks/use-team-members';
import { useModuleRoles, useRBAC } from '~/lib/rbac/rbac-provider';

// System fields with proper labels (source of truth for fallback labels)
const SYSTEM_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'ticket_number', label: 'Ticket #' },
  { key: 'subject', label: 'Subject' },
  { key: 'assignees', label: 'Assignees' },
  { key: 'status_id', label: 'Status' },
  { key: 'priority_id', label: 'Priority' },
  { key: 'category_id', label: 'Category' },
  { key: 'customer', label: 'Customer' },
  { key: 'created_at', label: 'Created' },
  { key: 'updated_at', label: 'Updated' },
  { key: 'description', label: 'Description' },
];

export default function ServiceCloudTicketsRoute() {
  const { currentWorkspace, canAccess, user } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  // Modals state
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<EntityField | null>(null);

  const productKey = 'service-cloud';
  const entityType = 'tickets';

  // 1. Roles and Team Members for FLS (Field Level Security)
  const { data: moduleRoles = [] } = useModuleRoles(productKey);
  const { data: teamMembersData } = useTeamMembers({
    workspaceId: workspaceId,
    productKey: productKey,
    enabled: !!workspaceId,
  });
  const teamMembersForModal = teamMembersData?.data ?? [];

  // 2. Admin Check
  const isAdmin = useMemo(() => {
    if (!workspaceId || !user?.id) return false;
    const isOwner = currentWorkspace?.owner_id === user.id;
    return (
      isOwner ||
      canAccess('tickets', 'admin') ||
      canAccess('tickets', 'update')
    );
  }, [workspaceId, user?.id, canAccess, currentWorkspace?.owner_id]);

  // 3. Dynamic Columns Hooks
  const {
    fields: allEntityFields = [],
    refetch: refetchEntityFields,
    updateFieldAccess,
    deleteField,
  } = useDynamicColumns({
    entityType,
    workspaceId: workspaceId,
    userId: user?.id,
    productKey,
    enabled: !!workspaceId && !!user?.id,
  });

  // 4. Field-Level Security (FLS): which columns can the current user view?
  const { canViewColumn } = useFieldPermissions({
    entityType,
    workspaceId: workspaceId,
    enabled: !!workspaceId && !!user?.id,
  });

  const createField = useCreateField();
  const updateField = useUpdateField();

  // 4. Mappers
  const customColumns = useMemo(() => {
    return allEntityFields
      .filter((f) => !f.is_system)
      .map((field) => ({
        key: field.field_key,
        label: field.field_label,
        render: (record: any) =>
          String(record.custom_fields?.[field.field_key] ?? '-'),
      }));
  }, [allEntityFields]);

  // Look up entity_field record for a key (same pattern as leads)
  const getEntityFieldByKey = (key: string): EntityField | null =>
    allEntityFields.find((f) => f.field_key === key) ?? null;

  const handleEditColumn = (columnKey: string) => {
    const existing = getEntityFieldByKey(columnKey);
    if (existing) {
      setEditingField(existing);
      return;
    }

    // Fall back to SYSTEM_FIELDS for proper label (not raw key)
    const systemField = SYSTEM_FIELDS.find((f) => f.key === columnKey);
    setEditingField({
      id: '',
      workspace_id: workspaceId!,
      entity_type: entityType,
      field_key: columnKey,
      field_label: systemField?.label ?? columnKey,
      field_type: 'text',
      description: null,
      is_system: true,
      is_required: false,
      is_active: true,
      display_order: 0,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as EntityField);
  };

  const handleUpdateField = async (
    fieldId: string,
    updates: { field_label?: string; access_type?: string; access_members?: any[] },
  ) => {
    try {
      if (!fieldId && editingField) {
        // System field being configured for the first time — create it in DB
        await createField.mutateAsync({
          workspace_id: workspaceId || '',
          entity_type: entityType,
          product_key: productKey,
          field_key: editingField.field_key,
          field_label:
            updates.field_label !== undefined
              ? updates.field_label
              : editingField.field_label,
          field_type: editingField.field_type || 'text',
          description: editingField.description ?? '',
          is_required: editingField.is_required,
          is_system: true,
          settings: editingField.settings || {},
          access_type: updates.access_type || 'public',
          access_members: updates.access_members,
        });
        setEditingField(null);
        refetchEntityFields();
        return;
      }

      // Update label in entity_fields if changed (same as leads page)
      if (updates.field_label !== undefined) {
        await updateField.mutateAsync({
          fieldId,
          updates: { field_label: updates.field_label },
        });
      }

      await updateFieldAccess.mutateAsync({
        fieldId,
        accessType: updates.access_type || 'public',
        members: updates.access_members,
      });
      setEditingField(null);
      refetchEntityFields();
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    try {
      await deleteField.mutateAsync({ fieldId });
      setEditingField(null);
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };


  if (!workspaceId) return <div>No workspace selected</div>;

  return (
    <>
      <ServiceCloudTicketsPage
        workspaceId={workspaceId}
        isAdmin={isAdmin}
        onColumnAddClick={() => setAddColumnModalOpen(true)}
        onColumnEditClick={handleEditColumn}
        customColumns={customColumns}
        systemFields={allEntityFields}
        canViewColumn={canViewColumn}
      />

      <AddColumnModal
        open={addColumnModalOpen}
        onOpenChange={setAddColumnModalOpen}
        entityType="tickets"
        roles={moduleRoles}
        teamMembers={teamMembersForModal}
        isAdmin={isAdmin}
        isSubmitting={createField.isPending}
        onSubmit={async (payload) => {
          await createField.mutateAsync({
            ...payload,
            workspace_id: workspaceId,
            product_key: productKey,
            entity_type: entityType,
          });
          refetchEntityFields();
        }}
      />

      <ColumnEditModal
        open={Boolean(editingField)}
        onOpenChange={(open) => {
          if (!open) setEditingField(null);
        }}
        field={
          (editingField ??
            ({
              id: '',
              field_key: '',
              field_label: '',
              is_system: false,
              workspace_id: workspaceId,
            } as EntityField)) as ColumnEditFieldShape
        }
        roles={moduleRoles}
        teamMembers={teamMembersForModal}
        onSave={(updates, accessType, members) => {
          handleUpdateField(editingField?.id || '', {
            ...updates,
            access_type: accessType,
            access_members: members,
          });
          setEditingField(null);
        }}
        onDelete={
          editingField && !editingField.is_system
            ? () => {
                handleDeleteField(editingField.id);
                setEditingField(null);
              }
            : undefined
        }
      />
    </>
  );
}

'use client';

import React, { useMemo, useState } from 'react';

import { ServiceCloudCustomersPage } from '@kit/service-cloud';
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
const CUSTOMER_SYSTEM_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job_title', label: 'Job Title' },
];

const ORGANIZATION_SYSTEM_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'website', label: 'Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

export default function ServiceCloudCustomersRoute() {
  const { currentWorkspace, canAccess, user } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  // Modals state
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const [activeEntityType, setActiveEntityType] = useState<'customers' | 'organizations'>('customers');
  const [editingField, setEditingField] = useState<EntityField | null>(null);

  const productKey = 'service-cloud';

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
      canAccess('service_cloud', 'admin') ||
      canAccess('service_cloud', 'update')
    );
  }, [workspaceId, user?.id, canAccess, currentWorkspace?.owner_id]);

  // 3. Dynamic Columns Hooks
  const {
    fields: customerFields = [],
    refetch: refetchCustomerFields,
    updateFieldAccess: updateCustomerFieldAccess,
    deleteField: deleteCustomerField,
  } = useDynamicColumns({
    entityType: 'customers',
    workspaceId: workspaceId,
    userId: user?.id,
    productKey,
    enabled: !!workspaceId && !!user?.id,
  });

  const {
    fields: organizationFields = [],
    refetch: refetchOrganizationFields,
    updateFieldAccess: updateOrganizationFieldAccess,
    deleteField: deleteOrganizationField,
  } = useDynamicColumns({
    entityType: 'organizations',
    workspaceId: workspaceId,
    userId: user?.id,
    productKey,
    enabled: !!workspaceId && !!user?.id,
  });

  // 4. Field-Level Security (FLS): per-column view/edit permissions for customers and organizations
  const { canViewColumn: canViewCustomerColumn, canView: canViewCustomerField, canEdit: canEditCustomerField } = useFieldPermissions({
    entityType: 'customers',
    workspaceId: workspaceId,
    enabled: !!workspaceId && !!user?.id,
    productKey,
  });

  const { canViewColumn: canViewOrganizationColumn, canView: canViewOrganizationField, canEdit: canEditOrganizationField } = useFieldPermissions({
    entityType: 'organizations',
    workspaceId: workspaceId,
    enabled: !!workspaceId && !!user?.id,
    productKey,
  });

  const { canViewColumn: canViewTicketColumn } = useFieldPermissions({
    entityType: 'tickets',
    workspaceId: workspaceId,
    enabled: !!workspaceId && !!user?.id,
    productKey,
  });

  const createField = useCreateField();
  const updateField = useUpdateField();

  // 4. Mappers
  const customCustomerColumns = useMemo(() => {
    return customerFields
      .filter((f) => !f.is_system)
      .map((field) => ({
        key: field.field_key,
        label: field.field_label,
        render: (record: any) =>
          String(record.custom_fields?.[field.field_key] ?? '-'),
      }));
  }, [customerFields]);

  const customOrganizationColumns = useMemo(() => {
    return organizationFields
      .filter((f) => !f.is_system)
      .map((field) => ({
        key: field.field_key,
        label: field.field_label,
        render: (record: any) =>
          String(record.custom_fields?.[field.field_key] ?? '-'),
      }));
  }, [organizationFields]);

  const handleEditColumn = (columnKey: string, type: 'customers' | 'organizations') => {
    setActiveEntityType(type);
    const fields = type === 'customers' ? customerFields : organizationFields;
    const existing = fields.find((f) => f.field_key === columnKey);

    if (existing) {
      setEditingField(existing);
      return;
    }

    // Fall back to SYSTEM_FIELDS for proper label
    const systemFields = type === 'customers' ? CUSTOMER_SYSTEM_FIELDS : ORGANIZATION_SYSTEM_FIELDS;
    const systemField = systemFields.find((f) => f.key === columnKey);

    setEditingField({
      id: '',
      workspace_id: workspaceId!,
      entity_type: type,
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
    if (!editingField) return;
    try {
      const type = editingField.entity_type as 'customers' | 'organizations';

      if (!fieldId) {
        // System field being configured for the first time — create it in DB
        await createField.mutateAsync({
          workspace_id: workspaceId || '',
          entity_type: type,
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
      } else {
        // Update label in entity_fields if changed (same as leads page)
        if (updates.field_label !== undefined) {
          await updateField.mutateAsync({
            fieldId,
            updates: { field_label: updates.field_label },
          });
        }

        const updater = type === 'customers' ? updateCustomerFieldAccess : updateOrganizationFieldAccess;
        await updater.mutateAsync({
          fieldId,
          accessType: updates.access_type || 'public',
          members: updates.access_members,
        });
      }

      setEditingField(null);
      type === 'customers' ? refetchCustomerFields() : refetchOrganizationFields();
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!editingField) return;
    try {
      const type = editingField.entity_type as 'customers' | 'organizations';
      const deleter = type === 'customers' ? deleteCustomerField : deleteOrganizationField;
      await deleter.mutateAsync({ fieldId });
      setEditingField(null);
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  if (!workspaceId) return <div>No workspace selected</div>;

  return (
    <>
      <ServiceCloudCustomersPage
        workspaceId={workspaceId}
        isAdmin={isAdmin}
        teamMembers={teamMembersForModal}
        onColumnAddClick={(type) => {
          setActiveEntityType(type);
          setAddColumnModalOpen(true);
        }}
        onColumnEditClick={handleEditColumn}
        customCustomerColumns={customCustomerColumns}
        customOrganizationColumns={customOrganizationColumns}
        systemCustomerFields={customerFields}
        systemOrganizationFields={organizationFields}
        canViewCustomerColumn={canViewCustomerColumn}
        canViewOrganizationColumn={canViewOrganizationColumn}
        canViewCustomerField={canViewCustomerField}
        canViewOrganizationField={canViewOrganizationField}
        canEditCustomerField={canEditCustomerField}
        canEditOrganizationField={canEditOrganizationField}
        canViewTicketColumn={canViewTicketColumn}
        currentUserId={user?.id}
      />

      <AddColumnModal
        open={addColumnModalOpen}
        onOpenChange={setAddColumnModalOpen}
        entityType={activeEntityType}
        roles={moduleRoles}
        teamMembers={teamMembersForModal}
        isAdmin={isAdmin}
        isSubmitting={createField.isPending}
        onSubmit={async (payload) => {
          await createField.mutateAsync({
            ...payload,
            workspace_id: workspaceId,
            product_key: productKey,
            entity_type: activeEntityType,
          });
          activeEntityType === 'customers' ? refetchCustomerFields() : refetchOrganizationFields();
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
        isAdmin={isAdmin}
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

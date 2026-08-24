import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createEntitlementService } from '~/lib/entitlements';
import { catchAsync } from '~/utils/response-handler';

const deleteLead = catchAsync(
  async ({
    request: _request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'leadId is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    // Get the active lead so repeated deletes cannot release usage twice.
    const { data: existingLead } = await supabase
      .from('crm_leads')
      .select('workspace_id, owner_id, created_by')
      .eq('id', leadId)
      .eq('is_deleted', false)
      .single();

    if (!existingLead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    // Get workspace to check if user is owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', existingLead.workspace_id)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;
    const isOwner = existingLead.owner_id === user.id;
    let hasPermission = isWorkspaceOwner || isOwner;

    // If not owner, check RBAC permissions
    if (!hasPermission) {
      const { data: members } = await supabase
        .from('workspace_members')
        .select('role_id, product_key')
        .eq('user_id', user.id)
        .eq('workspace_id', existingLead.workspace_id);

      const member =
        members?.find(
          (member: { product_key: string | null }) =>
            member.product_key === 'sales',
        ) ||
        members?.find(
          (member: { product_key: string | null }) =>
            member.product_key === null,
        ) ||
        members?.[0];

      if (member?.role_id) {
        const { data: permission } = await supabase
          .from('role_permissions')
          .select(
            `
            can_access,
            crm_module_features!inner (
              feature_key,
              crm_modules!inner (
                module_key
              )
            )
          `,
          )
          .eq('role_id', member.role_id)
          .eq('crm_module_features.feature_key', 'delete')
          .eq('crm_module_features.crm_modules.module_key', 'leads')
          .single();

        if (permission?.can_access) {
          hasPermission = true;
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { message: 'You do not have permission to delete this lead' },
        { status: 403 },
      );
    }

    // Soft delete lead
    const { data: lead, error } = await supabase
      .from('crm_leads')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', leadId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) {
      console.error('Delete lead error:', error);
      throw error;
    }

    await createEntitlementService().releaseUsage({
      workspaceId: existingLead.workspace_id,
      moduleKey: 'sales',
      featureKey: 'sales.leads',
      resourceId: leadId,
      resourceType: 'lead',
    });

    return NextResponse.json(
      {
        message: 'Lead deleted successfully',
        data: lead,
      },
      { status: 200 },
    );
  },
);

export { deleteLead };

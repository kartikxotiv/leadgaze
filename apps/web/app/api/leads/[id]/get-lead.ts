import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Database } from '~/lib/database.types';
import {
  filterLeadForRead,
  loadFieldPermissionContext,
} from '~/lib/field-permission';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type Lead = Database['public']['Tables']['crm_leads']['Row'];

type LeadWithRelations = Lead & {
  converted_account_id?: string | null;
  is_converted_to_account?: boolean;
  status?: {
    id: string;
    status_name: string;
    status_key: string;
    color: string;
    icon: string;
  } | null;
  source?: {
    id: string;
    source_name: string;
    source_key: string;
    color: string;
    icon: string;
  } | null;
  owner?: {
    id: string;
    email: string;
    name: string;
  } | null;
  industry?: {
    id: string;
    industry_name: string;
  } | null;
};

const getLeadById = catchAsync(
  async ({
    request: _request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        { message: 'leadId is required' },
        { status: 400 },
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the lead first to get workspace_id for the RPC access check
    const { data: leadStub, error } = await adminClient
      .from('crm_leads')
      .select('workspace_id, owner_id, created_by')
      .eq('id', leadId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      console.error('Get lead error:', error);
      throw error;
    }

    if (!leadStub) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    // Single RPC call replaces: accounts lookup, workspace owner check, membership check
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: accessResult, error: accessError } = await (
      adminClient as any
    ).rpc('resolve_workspace_access', {
      p_workspace_id: leadStub.workspace_id,
      p_user_id: user.id,
      p_user_email: user.email || null,
      p_require_shared_team: false,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (accessError) {
      console.error('Workspace access resolution error:', accessError);
      throw accessError;
    }

    const {
      is_owner: isOwner,
      is_member: isMember,
      visible_user_ids: rpcVisibleUserIds,
    } = accessResult;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    const { LeadsService } = await import('@kit/sales');
    const leadsService = new LeadsService(adminClient);

    const { lead: rawLead, relations } = await leadsService.getLeadDetails({
      leadId,
      workspaceId: leadStub.workspace_id,
      isOwner,
      visibleUserIds: rpcVisibleUserIds || [],
    });

    if (!rawLead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    const leadWithConversion = {
      ...rawLead,
      converted_account_id: relations.accounts?.[0]?.id || null,
      is_converted_to_account: Boolean(relations.accounts?.length),
    } as LeadWithRelations;

    const fieldCtx = await loadFieldPermissionContext(supabase, {
      workspaceId: leadStub.workspace_id,
      entityType: 'leads',
      productKey: 'sales',
      userId: user.id,
      moduleKey: 'leads',
    });

    return successDataResponse(
      'Lead retrieved successfully',
      filterLeadForRead(leadWithConversion, fieldCtx),
    );
  },
);

/**
 * PATCH /api/leads/[leadId]
 * Update an existing lead
 */

export { getLeadById };

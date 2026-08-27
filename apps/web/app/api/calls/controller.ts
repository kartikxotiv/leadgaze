import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
    catchAsync,
    successDataResponse
} from '~/utils/response-handler';
import { getEntityName } from '../_helpers/get-entity-name';
import { getRelatedEntityIds } from '../_helpers/get-related-entities';

/**
 * GET /api/calls
 * Fetch calls for an entity (or workspace)
 */
export const getCalls = catchAsync(
    async ({
        request,
    }: {
        request: NextRequest;
        params?: Record<string, string>;
    }) => {
        const supabase = getSupabaseServerClient();
        const url = new URL(request.url);
        const entityType = url.searchParams.get('entityType');
        const entityId = url.searchParams.get('entityId');
        const workspaceId = url.searchParams.get('workspaceId');

        if (!workspaceId) {
            return NextResponse.json(
                { message: 'workspaceId is required' },
                { status: 400 },
            );
        }

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        let uniqueCalls: any[] = [];

        if (entityType && entityId) {
            const { data, error } = await supabase
                .rpc('get_core_calls', {
                    p_workspace_id: workspaceId,
                    p_entity_type: entityType,
                    p_entity_id: entityId,
                });

            if (error) throw error;
            uniqueCalls = data || [];
        } else {
            const { data, error } = await supabase
                .from('crm_call_logs')
                .select('*, created_by_user:accounts(name, email)')
                .eq('workspace_id', workspaceId)
                .eq('is_deleted', false);

            if (error) throw error;
            uniqueCalls = data || [];
        }

        // Sort by date_time descending
        uniqueCalls.sort(
            (a, b) =>
                new Date(b.date_time).getTime() - new Date(a.date_time).getTime(),
        );

        // Annotate each call with the origin entity name for cross-module display
        const annotatedCalls = await Promise.all(
            uniqueCalls.map(async (call) => ({
                ...call,
                entity_name: await getEntityName(supabase, call.entity_type, call.entity_id),
            })),
        );

        return successDataResponse('Calls retrieved', annotatedCalls);
    },
);

/**
 * POST /api/calls
 * Create a new call log
 */
export const createCall = catchAsync(
    async ({
        request,
    }: {
        request: NextRequest;
        params?: Record<string, string>;
    }) => {
        const supabase = getSupabaseServerClient();
        const body = await request.json();
        const {
            workspace_id,
            entity_type,
            entity_id,
            subject,
            call_type,
            status,
            contact_name,
            date_time,
            comments,
            duration_minutes // Note: Schema doesn't have duration_minutes in the CREATE TABLE provided, checking if I missed it or if it needs to be added/handled. 
            // Re-reading schema: It only has subject, call_type, status, contact_name, date_time, comments. 
            // I will stick to schema. If duration is needed, it might be in comments or I'd need to alter table. 
            // For now, I will omit duration_minutes if not in schema, or check if I missed it.
            // Schema:
            // subject VARCHAR(255) NOT NULL,
            // call_type VARCHAR(50) NOT NULL DEFAULT 'outbound',
            // status VARCHAR(50) NOT NULL DEFAULT 'completed',
            // contact_name VARCHAR(255),
            // date_time TIMESTAMPTZ NOT NULL,
            // comments TEXT,
        } = body;

        // Get current user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { data: call, error } = await supabase
            .from('crm_call_logs')
            .insert({
                workspace_id,
                entity_type,
                entity_id,
                subject,
                call_type,
                status,
                contact_name,
                date_time,
                comments,
                created_by: user.id,
            })
            .select('*, created_by_user:accounts(name, email)')
            .single();

        if (error) {
            console.error('Create call error:', error);
            throw error;
        }

        return successDataResponse('Call logged', call);
    },
);

/**
 * PATCH /api/calls/[id]
 * Update a call log
 */
export const updateCall = catchAsync(
    async ({
        request,
        params,
    }: {
        request: NextRequest;
        params?: Record<string, string>;
    }) => {
        const supabase = getSupabaseServerClient();
        const callId = params?.id;
        const body = await request.json();
        const { subject, call_type, status, contact_name, date_time, comments } = body;

        if (!callId) {
            return NextResponse.json({ message: 'ID required' }, { status: 400 });
        }

        const { data: call, error } = await supabase
            .from('crm_call_logs')
            .update({
                subject,
                call_type,
                status,
                contact_name,
                date_time,
                comments,
                updated_at: new Date().toISOString()
            })
            .eq('id', callId)
            .select('*, created_by_user:accounts(name, email)')
            .single();

        if (error) {
            console.error('Update call error:', error);
            throw error;
        }

        return successDataResponse('Call updated', call);
    },
);

/**
 * DELETE /api/calls/[id]
 * Delete a call log (soft delete)
 */
export const deleteCall = catchAsync(
    async ({
        request,
        params,
    }: {
        request: NextRequest;
        params?: Record<string, string>;
    }) => {
        const supabase = getSupabaseServerClient();
        const callId = params?.id;

        if (!callId)
            return NextResponse.json({ message: 'ID required' }, { status: 400 });

        const { error } = await supabase
            .from('crm_call_logs')
            .update({ is_deleted: true, deleted_at: new Date().toISOString() })
            .eq('id', callId);

        if (error) throw error;

        return successDataResponse('Call deleted');
    },
);

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '~/utils/response-handler';

/**
 * GET /api/notes
 * Fetch notes for an entity
 */
export const getNotes = catchAsync(
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

    if (!entityType || !entityId || !workspaceId) {
      return NextResponse.json(
        { message: 'entityType, entityId, and workspaceId are required' },
        { status: 400 },
      );
    }

    const { data: notes, error } = await supabase
      .from('crm_notes')
      .select('*, created_by_user:accounts(name, email)') // Note: created_by links to accounts
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get notes error:', error);
      throw error;
    }

    return successDataResponse('Notes retrieved', notes || []);
  },
);

/**
 * POST /api/notes
 * Create a new note
 */
export const createNote = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { workspace_id, entity_type, entity_id, content } = body;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: note, error } = await supabase
      .from('crm_notes')
      .insert({
        workspace_id,
        entity_type,
        entity_id,
        content,
        created_by: user.id,
      })
      .select('*, created_by_user:accounts(name, email)')
      .single();

    if (error) {
      console.error('Create note error:', error);
      throw error;
    }

    return successDataResponse('Note created', note);
  },
);

export const updateNote = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const noteId = params?.id;
    const body = await request.json();
    const { content } = body;

    if (!noteId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from('crm_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .select('*, created_by_user:accounts(name, email)')
      .single();

    if (error) {
      console.error('Update note error:', error);
      throw error;
    }

    return successDataResponse('Note updated', note);
  },
);

export const deleteNote = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    // Basic delete logic
    const supabase = getSupabaseServerClient();
    const noteId = params?.id;

    if (!noteId)
      return NextResponse.json({ message: 'ID required' }, { status: 400 });

    const { error } = await supabase
      .from('crm_notes')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', noteId);

    if (error) throw error;

    return successDataResponse('Note deleted');
  },
);

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '~/utils/response-handler';
import { getRelatedEntityIds } from '../_helpers/get-related-entities';
import { getEntityName } from '../_helpers/get-entity-name';

// Map UI sales entity types to database convention (sales_*)
function toDbEntityType(type: string): string {
  const salesTypes = ['lead', 'contact', 'account', 'opportunity'];
  if (salesTypes.includes(type)) {
    return `sales_${type}`;
  }
  return type;
}

// Map database convention (sales_*) back to UI types
function toUiEntityType(type: string): string {
  if (type?.startsWith('sales_')) {
    return type.substring(6);
  }
  return type;
}

import { NotesService } from '@kit/core';

/**
 * GET /api/notes
 * Fetch notes for an entity
 * Includes notes from related entities (lead conversion chain)
 * Filters by user unless workspace owner
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
    const status = url.searchParams.get('status') || 'active';

    const searchTerm = url.searchParams.get('searchTerm') || '';
    const createdByIds = url.searchParams.get('createdByIds') || '';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const updatedAtFrom = url.searchParams.get('updatedAtFrom') || '';
    const updatedAtTo = url.searchParams.get('updatedAtTo') || '';

    const pageParam = url.searchParams.get('page');
    const limitParam = url.searchParams.get('limit');
    const page = pageParam ? parseInt(pageParam, 10) : null;
    const limit = limitParam ? parseInt(limitParam, 10) : null;
    const moduleParam = url.searchParams.get('module');

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

    // Check if user is workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;

    const notesService = new NotesService(supabase);
    const result = await notesService.getNotes({
      workspaceId,
      entityType,
      entityId,
      status,
      searchTerm,
      createdByIds,
      createdAtFrom,
      createdAtTo,
      updatedAtFrom,
      updatedAtTo,
      isWorkspaceOwner,
      userId: user.id,
      page,
      limit,
      module: moduleParam || undefined,
    });

    const rawList = Array.isArray(result) ? result : (result.data || []);
    const formattedNotes = rawList.map((note: any) => ({
      ...note,
      content: note.note || note.content,
      entity_type: note.entity_type || entityType || null,
      entity_id: note.entity_id || entityId || null,
      entity_name: note.entity_name || null,
      created_by_user: note.created_by_user
        ? { name: note.created_by_user.name || null, email: note.created_by_user.email || null }
        : null,
    }));

    if (pageParam || limitParam) {
      return NextResponse.json({
        success: true,
        data: formattedNotes,
        count: result.total ?? formattedNotes.length,
        total: result.total ?? formattedNotes.length,
        page: result.page ?? 1,
        limit: result.limit ?? formattedNotes.length,
        has_more: result.has_more ?? false,
      });
    }

    return successDataResponse('Notes retrieved', formattedNotes || []);
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

    const { data: noteData, error: noteError } = await supabase
      .schema('core')
      .from('notes')
      .insert({
        workspace_id,
        note: content,
        created_by: user.id,
        updated_by: user.id,
      })
      .select('*')
      .single();

    if (noteError) {
      console.error('Create note error:', noteError);
      throw noteError;
    }

    const { error: relationError } = await supabase
      .schema('core')
      .from('note_relations')
      .insert({
        workspace_id,
        note_id: noteData.id,
        entity_type: toDbEntityType(entity_type),
        entity_id,
      });

    if (relationError) {
      console.error('Create note relation error:', relationError);
      throw relationError;
    }

    // Retrieve user profile to match response format
    const { data: userAccount } = await supabase
      .from('accounts')
      .select('name, email')
      .eq('id', user.id)
      .single();

    const note: any = {
      ...noteData,
      content: noteData.note,
      entity_type: toUiEntityType(entity_type),
      entity_id,
      created_by_user: userAccount,
    };

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
    const { content, is_closed } = body;

    if (!noteId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    // Get current user (needed for closed_by tracking)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Build update payload
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
    if (content !== undefined) {
      updatePayload.note = content;
    }
    if (is_closed !== undefined) {
      updatePayload.is_closed = is_closed;
      if (is_closed) {
        updatePayload.closed_at = new Date().toISOString();
        updatePayload.closed_by = user.id;
      } else {
        updatePayload.closed_at = null;
        updatePayload.closed_by = null;
      }
    }

    const { data: noteData, error } = await supabase
      .schema('core')
      .from('notes')
      .update(updatePayload)
      .eq('id', noteId)
      .select('*')
      .single();

    if (error) {
      console.error('Update note error:', error);
      throw error;
    }

    // Retrieve user profile to match response format
    let userAccount = null;
    if (noteData.created_by) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', noteData.created_by)
        .maybeSingle();
      userAccount = data;
    }

    // Get entity_type and entity_id from relations for the return payload
    const { data: relation } = await supabase
      .schema('core')
      .from('note_relations')
      .select('entity_type, entity_id')
      .eq('note_id', noteId)
      .maybeSingle();

    const note: any = {
      ...noteData,
      content: noteData.note,
      entity_type: toUiEntityType(relation?.entity_type),
      entity_id: relation?.entity_id,
      created_by_user: userAccount,
    };

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
      .schema('core')
      .from('notes')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', noteId);

    if (error) throw error;

    return successDataResponse('Note deleted');
  },
);

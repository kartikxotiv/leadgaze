import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '~/utils/response-handler';
import { getRelatedEntityIds } from '../_helpers/get-related-entities';
import { getEntityName } from '../_helpers/get-entity-name';

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

    let uniqueNotes: any[] = [];

    if (entityType && entityId) {
      // Get all related entity IDs (includes lead conversion chain)
      const entityIds = await getRelatedEntityIds(supabase, entityType, entityId);

      // Build query - fetch notes for all related entities
      const notePromises = entityIds.map(({ entity_type, entity_id }) => {
        let query = supabase
          .from('crm_notes')
          .select('*, created_by_user:accounts(name, email)')
          .eq('workspace_id', workspaceId)
          .eq('entity_type', entity_type)
          .eq('entity_id', entity_id)
          .eq('is_deleted', false);

        if (!isWorkspaceOwner) {
          query = query.eq('created_by', user.id);
        }

        return query;
      });

      const results = await Promise.all(notePromises);
      const allNotes = results.flatMap((result) => result.data || []);
      uniqueNotes = Array.from(
        new Map(allNotes.map((note) => [note.id, note])).values(),
      );
    } else {
      // Fetch all notes for the workspace
      let query = supabase
        .from('crm_notes')
        .select('*, created_by_user:accounts(name, email)')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);

      if (!isWorkspaceOwner) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      uniqueNotes = data || [];
    }

    // Sort by created_at descending
    uniqueNotes.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Add entity names to each note
    const notesWithEntityNames = await Promise.all(
      uniqueNotes.map(async (note) => {
        const entityName = await getEntityName(
          supabase,
          note.entity_type,
          note.entity_id,
        );
        return {
          ...note,
          entity_name: entityName,
        };
      }),
    );

    return successDataResponse('Notes retrieved', notesWithEntityNames || []);
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

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
    const isClosedFilter = status === 'closed';

    const searchTerm = url.searchParams.get('searchTerm') || '';
    const createdByIds = url.searchParams.get('createdByIds') || '';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const updatedAtFrom = url.searchParams.get('updatedAtFrom') || '';
    const updatedAtTo = url.searchParams.get('updatedAtTo') || '';

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

      // Fetch note IDs from core.note_relations for the related entities (with DB schema mapping)
      const relationPromises = entityIds.map(async ({ entity_type, entity_id }) => {
        const dbType = toDbEntityType(entity_type);
        const { data } = await supabase
          .schema('core')
          .from('note_relations')
          .select('note_id')
          .eq('workspace_id', workspaceId)
          .eq('entity_type', dbType)
          .eq('entity_id', entity_id);
        return data || [];
      });

      const relationResults = await Promise.all(relationPromises);
      const noteIds = Array.from(
        new Set(relationResults.flat().map((r: any) => r.note_id))
      );

      if (noteIds.length === 0) {
        uniqueNotes = [];
      } else {
        let query = supabase
          .schema('core')
          .from('notes')
          .select('*, note_relations(*)')
          .eq('workspace_id', workspaceId)
          .in('id', noteIds)
          .eq('is_deleted', false)
          .eq('is_closed', isClosedFilter);

        if (!isWorkspaceOwner) {
          query = query.eq('created_by', user.id);
        }

        if (createdByIds && createdByIds !== 'all') {
          const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
          if (ids.length > 0) {
            query = query.in('created_by', ids);
          }
        }
        if (searchTerm) {
          query = query.ilike('note', `%${searchTerm}%`);
        }
        if (createdAtFrom) query = query.gte('created_at', `${createdAtFrom}T00:00:00.000Z`);
        if (createdAtTo) query = query.lte('created_at', `${createdAtTo}T23:59:59.999Z`);
        if (updatedAtFrom) query = query.gte('updated_at', `${updatedAtFrom}T00:00:00.000Z`);
        if (updatedAtTo) query = query.lte('updated_at', `${updatedAtTo}T23:59:59.999Z`);

        const { data, error } = await query;
        if (error) throw error;
        uniqueNotes = data || [];
      }
    } else {
      // Fetch all notes for the workspace
      let query = supabase
        .schema('core')
        .from('notes')
        .select('*, note_relations(*)')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .eq('is_closed', isClosedFilter);

      if (!isWorkspaceOwner) {
        query = query.eq('created_by', user.id);
      }

      if (entityType) {
        const dbType = toDbEntityType(entityType);
        const { data: relations } = await supabase
          .schema('core')
          .from('note_relations')
          .select('note_id')
          .eq('workspace_id', workspaceId)
          .eq('entity_type', dbType);
        const noteIds = Array.from(new Set(relations?.map((r: any) => r.note_id) || []));
        if (noteIds.length === 0) {
          query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
        } else {
          query = query.in('id', noteIds);
        }
      }

      if (createdByIds && createdByIds !== 'all') {
        const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          query = query.in('created_by', ids);
        }
      }
      if (searchTerm) {
        query = query.ilike('note', `%${searchTerm}%`);
      }
      if (createdAtFrom) query = query.gte('created_at', `${createdAtFrom}T00:00:00.000Z`);
      if (createdAtTo) query = query.lte('created_at', `${createdAtTo}T23:59:59.999Z`);
      if (updatedAtFrom) query = query.gte('updated_at', `${updatedAtFrom}T00:00:00.000Z`);
      if (updatedAtTo) query = query.lte('updated_at', `${updatedAtTo}T23:59:59.999Z`);

      const { data, error } = await query;
      if (error) throw error;
      uniqueNotes = data || [];
    }

    // Fetch user details for created_by (avoiding cross-schema PostgREST join issues)
    const accountIds = Array.from(
      new Set(uniqueNotes.map((n) => n.created_by).filter(Boolean)),
    );
    const accountsMap = new Map();
    if (accountIds.length > 0) {
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name, email')
        .in('id', accountIds);
      accountsData?.forEach((acc: any) => {
        accountsMap.set(acc.id, acc);
      });
    }

    // Sort by created_at descending
    uniqueNotes.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Add entity names to each note
    const notesWithEntityNames = await Promise.all(
      uniqueNotes.map(async (note) => {
        const relation = note.note_relations?.[0] || {};
        const entityTypeVal = toUiEntityType(note.entity_type ?? relation.entity_type);
        const entityIdVal = note.entity_id ?? relation.entity_id;
        const entityName = entityTypeVal && entityIdVal
          ? await getEntityName(supabase, entityTypeVal as any, entityIdVal)
          : null;
        return {
          ...note,
          content: note.note,
          entity_type: entityTypeVal,
          entity_id: entityIdVal,
          entity_name: entityName,
          created_by_user: note.created_by ? accountsMap.get(note.created_by) || null : null,
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

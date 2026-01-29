import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '../../../utils/response-handler';
import { getRelatedEntityIds } from '../_helpers/get-related-entities';
import { getEntityName } from '../_helpers/get-entity-name';

/**
 * GET /api/documents
 * Fetch documents for an entity
 * Includes documents from related entities (lead conversion chain)
 * Filters by user unless workspace owner
 */
export const getDocuments = catchAsync(
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

    // Get all related entity IDs (includes lead conversion chain)
    const entityIds = await getRelatedEntityIds(supabase, entityType, entityId);

    // Build query - fetch documents for all related entities
    const documentPromises = entityIds.map(({ entity_type, entity_id }) => {
      let query = supabase
        .from('crm_documents')
        .select('*, created_by_user:accounts(name, email)')
        .eq('workspace_id', workspaceId)
        .eq('entity_type', entity_type)
        .eq('entity_id', entity_id)
        .eq('is_deleted', false);

      // Filter by user unless workspace owner
      if (!isWorkspaceOwner) {
        query = query.eq('created_by', user.id);
      }

      return query;
    });

    // Execute all queries and combine results
    const results = await Promise.all(documentPromises);
    const allDocuments = results.flatMap((result) => result.data || []);

    // Remove duplicates
    const uniqueDocuments = Array.from(
      new Map(allDocuments.map((doc) => [doc.id, doc])).values(),
    );

    // Sort by created_at descending
    uniqueDocuments.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Add entity names to each document
    const documentsWithEntityNames = await Promise.all(
      uniqueDocuments.map(async (document) => {
        const entityName = await getEntityName(
          supabase,
          document.entity_type,
          document.entity_id,
        );
        return {
          ...document,
          entity_name: entityName,
        };
      }),
    );

    const documents = documentsWithEntityNames;
    const error = results.find((r) => r.error)?.error;

    if (error) {
      console.error('Get documents error:', error);
      throw error;
    }

    return successDataResponse('Documents retrieved', documents || []);
  },
);

/**
 * POST /api/documents
 * Upload file to storage and create metadata record
 */
export const createDocument = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();

    // Handle Multipart Form Data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const workspace_id = formData.get('workspace_id') as string;
    const entity_type = formData.get('entity_type') as string;
    const entity_id = formData.get('entity_id') as string;

    if (!file || !workspace_id || !entity_type || !entity_id) {
      return NextResponse.json(
        { message: 'Missing required fields' },
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

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${workspace_id}/${entity_type}/${entity_id}/${Date.now()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('crm_documents')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // 2. Insert Metadata into Database
    const { data: document, error } = await supabase
      .from('crm_documents')
      .insert({
        workspace_id,
        entity_type,
        entity_id,
        name: file.name,
        file_path: uploadData.path,
        file_type: file.type,
        size_bytes: file.size,
        created_by: user.id,
      })
      .select('*, created_by_user:accounts(name, email)')
      .single();

    if (error) {
      console.error('Create document record error:', error);
      // Optional: Cleanup uploaded file if DB insert fails
      throw error;
    }

    return successDataResponse('Document uploaded', document);
  },
);

/**
 * PATCH /api/documents/:id
 * Update document metadata
 */
export const updateDocument = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const documentId = params?.id;
    const body = await request.json();
    const { name } = body;

    if (!documentId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    const { data: document, error } = await supabase
      .from('crm_documents')
      .update({
        name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*, created_by_user:accounts(name, email)')
      .single();

    if (error) {
      console.error('Update document error:', error);
      throw error;
    }

    return successDataResponse('Document updated', document);
  },
);

/**
 * DELETE /api/documents/:id
 * Soft delete document
 */
export const deleteDocument = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const documentId = params?.id;

    if (!documentId) {
      return NextResponse.json({ message: 'ID required' }, { status: 400 });
    }

    // 1. Get document to get file path
    const { data: document, error: fetchError } = await supabase
      .from('crm_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Soft delete from DB
    const { error: dbError } = await supabase
      .from('crm_documents')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', documentId);

    if (dbError) throw dbError;

    // Note: We might want to delete from storage too, but soft delete is safer for now.
    // if (document?.file_path) {
    //   await supabase.storage.from('crm_documents').remove([document.file_path]);
    // }

    return successDataResponse('Document deleted');
  },
);

import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '../../../utils/response-handler';
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

import { DocumentsService } from '@kit/core';

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

    const type = url.searchParams.get('type');
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

    const documentsService = new DocumentsService(supabase);
    const result = await documentsService.getDocuments({
      workspaceId,
      entityType,
      entityId,
      type,
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
    });

    const rawList = Array.isArray(result) ? result : (result.data || []);
    const formattedDocuments = rawList.map((document: any) => ({
      id: document.id,
      workspace_id: document.workspace_id,
      name: document.name,
      description: document.description,
      file_path: document.file_path,
      file_url: document.file_url,
      file_type: document.file_type,
      size_bytes: Number(document.file_size || document.size_bytes || 0),
      category: document.category,
      is_deleted: document.is_deleted,
      deleted_at: document.deleted_at,
      created_by: document.created_by,
      created_at: document.created_at,
      updated_at: document.updated_at,
      created_by_user: document.created_by_user
        ? { name: document.created_by_user.name || null, email: document.created_by_user.email || null }
        : null,
      entity_type: document.entity_type || entityType || 'lead',
      entity_id: document.entity_id || entityId || '',
      entity_name: document.entity_name || '',
    }));

    if (pageParam || limitParam) {
      return NextResponse.json({
        success: true,
        data: formattedDocuments,
        count: result.total ?? formattedDocuments.length,
        total: result.total ?? formattedDocuments.length,
        page: result.page ?? 1,
        limit: result.limit ?? formattedDocuments.length,
        has_more: result.has_more ?? false,
      });
    }

    return successDataResponse('Documents retrieved', formattedDocuments || []);
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
    const { data: docData, error } = await supabase
      .schema('core')
      .from('documents')
      .insert({
        workspace_id,
        name: file.name,
        file_path: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Create document record error:', error);
      throw error;
    }

    // 3. Insert Relation into Database
    const dbType = toDbEntityType(entity_type);
    const { error: relationError } = await supabase
      .schema('core')
      .from('document_relations')
      .insert({
        workspace_id,
        document_id: docData.id,
        entity_type: dbType,
        entity_id,
      });

    if (relationError) {
      console.error('Create document relation record error:', relationError);
      throw relationError;
    }

    // Fetch user profiles in JS
    let createdByUser = null;
    if (docData.created_by) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', docData.created_by)
        .maybeSingle();
      createdByUser = data;
    }

    const document = {
      id: docData.id,
      workspace_id: docData.workspace_id,
      name: docData.name,
      description: docData.description,
      file_path: docData.file_path,
      file_url: docData.file_url,
      file_type: docData.file_type,
      size_bytes: Number(docData.file_size || 0),
      category: docData.category,
      is_deleted: docData.is_deleted,
      deleted_at: docData.deleted_at,
      created_by: docData.created_by,
      created_at: docData.created_at,
      updated_at: docData.updated_at,
      created_by_user: createdByUser,
      entity_type,
      entity_id,
    };

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

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: docData, error } = await supabase
      .schema('core')
      .from('documents')
      .update({
        name,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq('id', documentId)
      .select('*')
      .single();

    if (error) {
      console.error('Update document error:', error);
      throw error;
    }

    // Retrieve relation details
    const { data: relation } = await supabase
      .schema('core')
      .from('document_relations')
      .select('entity_type, entity_id')
      .eq('document_id', documentId)
      .maybeSingle();

    // Fetch user profiles in JS
    let createdByUser = null;
    if (docData.created_by) {
      const { data } = await supabase
        .from('accounts')
        .select('name, email')
        .eq('id', docData.created_by)
        .maybeSingle();
      createdByUser = data;
    }

    const document = {
      id: docData.id,
      workspace_id: docData.workspace_id,
      name: docData.name,
      description: docData.description,
      file_path: docData.file_path,
      file_url: docData.file_url,
      file_type: docData.file_type,
      size_bytes: Number(docData.file_size || 0),
      category: docData.category,
      is_deleted: docData.is_deleted,
      deleted_at: docData.deleted_at,
      created_by: docData.created_by,
      created_at: docData.created_at,
      updated_at: docData.updated_at,
      created_by_user: createdByUser,
      entity_type: toUiEntityType(relation?.entity_type),
      entity_id: relation?.entity_id,
    };

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Soft delete from DB
    const { error: dbError } = await supabase
      .schema('core')
      .from('documents')
      .update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null 
      })
      .eq('id', documentId);

    if (dbError) throw dbError;

    return successDataResponse('Document deleted');
  },
);

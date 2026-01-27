import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse
} from '../../../utils/response-handler';

/**
 * GET /api/documents
 * Fetch documents for an entity
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

    const { data: documents, error } = await supabase
      .from('crm_documents')
      .select('*, created_by_user:accounts(name, email)')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

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

/**
 * GET /api/documents/download/:id
 * Download document from storage
 */
export const downloadDocument = catchAsync(
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

    const { data: document, error: fetchError } = await supabase
      .from('crm_documents')
      .select('*')
      .eq('id', documentId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // 2. Download from storage
    const { data, error: downloadError } = await supabase.storage
      .from('crm_documents')
      .download(document.file_path);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw downloadError;
    }

    // 3. Return file with headers
    return new NextResponse(data, {
      headers: {
        'Content-Type': document.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.name}"`,
      },
    });
  },
);

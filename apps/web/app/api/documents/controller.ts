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

    let dbDocuments: any[] = [];

    if (entityType && entityId) {
      // Get all related entity IDs (includes lead conversion chain)
      const entityIds = await getRelatedEntityIds(supabase, entityType, entityId);

      // Build query - fetch documents for all related entities
      const documentPromises = entityIds.map(async ({ entity_type, entity_id }) => {
        const dbType = toDbEntityType(entity_type);
        // Find relations first
        const { data: relations } = await supabase
          .schema('core')
          .from('document_relations')
          .select('document_id')
          .eq('workspace_id', workspaceId)
          .eq('entity_type', dbType)
          .eq('entity_id', entity_id);

        if (!relations || relations.length === 0) return [];

        const documentIds = relations.map((r) => r.document_id);

        let query = supabase
          .schema('core')
          .from('documents')
          .select('*')
          .in('id', documentIds)
          .eq('workspace_id', workspaceId)
          .eq('is_deleted', false);

        if (!isWorkspaceOwner) {
          query = query.eq('created_by', user.id);
        }

        if (type && type !== 'all') {
          if (type === 'pdf') {
            query = query.ilike('file_type', '%pdf%');
          } else if (type === 'image') {
            query = query.or('file_type.ilike.%image%,file_type.ilike.%png%,file_type.ilike.%jpg%,file_type.ilike.%jpeg%');
          } else if (type === 'sheet') {
            query = query.or('file_type.ilike.%sheet%,file_type.ilike.%excel%,file_type.ilike.%xlsx%,file_type.ilike.%xls%,file_type.ilike.%csv%');
          } else if (type === 'document') {
            query = query.not('file_type', 'ilike', '%pdf%')
                         .not('file_type', 'ilike', '%image%')
                         .not('file_type', 'ilike', '%png%')
                         .not('file_type', 'ilike', '%jpg%')
                         .not('file_type', 'ilike', '%jpeg%')
                         .not('file_type', 'ilike', '%sheet%')
                         .not('file_type', 'ilike', '%excel%')
                         .not('file_type', 'ilike', '%xlsx%')
                         .not('file_type', 'ilike', '%xls%')
                         .not('file_type', 'ilike', '%csv%');
          }
        }
        if (createdByIds && createdByIds !== 'all') {
          const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
          if (ids.length > 0) {
            query = query.in('created_by', ids);
          }
        }
        if (searchTerm) {
          query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        }
        if (createdAtFrom) query = query.gte('created_at', (createdAtFrom.includes('T') ? createdAtFrom : `${createdAtFrom}T00:00:00.000Z`));
        if (createdAtTo) query = query.lte('created_at', (createdAtTo.includes('T') ? createdAtTo : `${createdAtTo}T23:59:59.999Z`));
        if (updatedAtFrom) query = query.gte('updated_at', (updatedAtFrom.includes('T') ? updatedAtFrom : `${updatedAtFrom}T00:00:00.000Z`));
        if (updatedAtTo) query = query.lte('updated_at', (updatedAtTo.includes('T') ? updatedAtTo : `${updatedAtTo}T23:59:59.999Z`));

        const { data } = await query;
        return data || [];
      });

      const results = await Promise.all(documentPromises);
      const allDocuments = results.flat();
      dbDocuments = Array.from(
        new Map(allDocuments.map((doc) => [doc.id, doc])).values(),
      );
    } else {
      // Fetch all documents for the workspace
      let query = supabase
        .schema('core')
        .from('documents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);

      if (!isWorkspaceOwner) {
        query = query.eq('created_by', user.id);
      }

      if (entityType) {
        const dbType = toDbEntityType(entityType);
        const { data: relations } = await supabase
          .schema('core')
          .from('document_relations')
          .select('document_id')
          .eq('workspace_id', workspaceId)
          .eq('entity_type', dbType);
        const documentIds = Array.from(new Set(relations?.map((r) => r.document_id) || []));
        if (documentIds.length === 0) {
          query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
        } else {
          query = query.in('id', documentIds);
        }
      }

      if (type && type !== 'all') {
        if (type === 'pdf') {
          query = query.ilike('file_type', '%pdf%');
        } else if (type === 'image') {
          query = query.or('file_type.ilike.%image%,file_type.ilike.%png%,file_type.ilike.%jpg%,file_type.ilike.%jpeg%');
        } else if (type === 'sheet') {
          query = query.or('file_type.ilike.%sheet%,file_type.ilike.%excel%,file_type.ilike.%xlsx%,file_type.ilike.%xls%,file_type.ilike.%csv%');
        } else if (type === 'document') {
          query = query.not('file_type', 'ilike', '%pdf%')
                       .not('file_type', 'ilike', '%image%')
                       .not('file_type', 'ilike', '%png%')
                       .not('file_type', 'ilike', '%jpg%')
                       .not('file_type', 'ilike', '%jpeg%')
                       .not('file_type', 'ilike', '%sheet%')
                       .not('file_type', 'ilike', '%excel%')
                       .not('file_type', 'ilike', '%xlsx%')
                       .not('file_type', 'ilike', '%xls%')
                       .not('file_type', 'ilike', '%csv%');
        }
      }
      if (createdByIds && createdByIds !== 'all') {
        const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
        if (ids.length > 0) {
          query = query.in('created_by', ids);
        }
      }
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }
      if (createdAtFrom) query = query.gte('created_at', (createdAtFrom.includes('T') ? createdAtFrom : `${createdAtFrom}T00:00:00.000Z`));
      if (createdAtTo) query = query.lte('created_at', (createdAtTo.includes('T') ? createdAtTo : `${createdAtTo}T23:59:59.999Z`));
      if (updatedAtFrom) query = query.gte('updated_at', (updatedAtFrom.includes('T') ? updatedAtFrom : `${updatedAtFrom}T00:00:00.000Z`));
      if (updatedAtTo) query = query.lte('updated_at', (updatedAtTo.includes('T') ? updatedAtTo : `${updatedAtTo}T23:59:59.999Z`));

      const { data, error } = await query;
      if (error) throw error;
      dbDocuments = data || [];
    }

    // Sort by created_at descending
    dbDocuments.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // Fetch user details for creator in JS to prevent PostgREST cross-schema join errors
    const userIds = Array.from(
      new Set(
        dbDocuments
          .map((d) => d.created_by)
          .filter(Boolean),
      ),
    );

    let usersMap: Record<string, { name: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name, email')
        .in('id', userIds);

      if (accounts) {
        accounts.forEach((acc) => {
          usersMap[acc.id] = { name: acc.name, email: acc.email };
        });
      }
    }

    // Resolve relations to get entity information
    const docIds = dbDocuments.map((d) => d.id);
    let relationsMap: Record<string, { entity_type: string; entity_id: string }> = {};
    if (docIds.length > 0) {
      const { data: relations } = await supabase
        .schema('core')
        .from('document_relations')
        .select('document_id, entity_type, entity_id')
        .in('document_id', docIds);

      if (relations) {
        relations.forEach((rel) => {
          relationsMap[rel.document_id] = {
            entity_type: toUiEntityType(rel.entity_type),
            entity_id: rel.entity_id,
          };
        });
      }
    }

    // Add entity names to each document and map response format
    const documentsWithEntityNames = await Promise.all(
      dbDocuments.map(async (document) => {
        const relation = relationsMap[document.id];
        const currentEntityType = relation?.entity_type || entityType || 'lead';
        const currentEntityId = relation?.entity_id || entityId || '';

        const entityName = await getEntityName(
          supabase,
          currentEntityType,
          currentEntityId,
        );

        return {
          id: document.id,
          workspace_id: document.workspace_id,
          name: document.name,
          description: document.description,
          file_path: document.file_path,
          file_url: document.file_url,
          file_type: document.file_type,
          size_bytes: Number(document.file_size || 0),
          category: document.category,
          is_deleted: document.is_deleted,
          deleted_at: document.deleted_at,
          created_by: document.created_by,
          created_at: document.created_at,
          updated_at: document.updated_at,
          created_by_user: document.created_by ? usersMap[document.created_by] || null : null,
          entity_type: currentEntityType,
          entity_id: currentEntityId,
          entity_name: entityName,
        };
      }),
    );

    return successDataResponse('Documents retrieved', documentsWithEntityNames || []);
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

import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';

import { createCoreControllers } from '../_shared/core-crud';
import { assertCoreWorkspaceAccess } from '../_shared/workspace-access';
import { catchAsync, successDataResponse } from '../../utils/response-handler';

const CORE_DOCUMENTS_BUCKET = 'core_documents';

const documents = createCoreControllers({
  table: 'documents',
  relation: { table: 'document_relations', foreignKey: 'document_id' },
  label: 'Document',
  requiredCreateFields: ['workspace_id', 'entity_type', 'entity_id', 'name'],
  createPayload: () => {
    throw new Error('Document create is handled by the dedicated storage controller');
  },
  updatePayload: () => {
    throw new Error('Document update is handled by the dedicated storage controller');
  },
});

type DocumentRelation = {
  entity_type: string;
  entity_id: string;
};

type ParsedDocumentRequest = {
  workspaceId: string | null;
  id: string | null;
  name: string | null;
  description: string | null;
  category: string | null;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  filePath: string | null;
  file: File | null;
  relations: DocumentRelation[];
};

function cleanUndefined(payload: Record<string, unknown>) {
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

function removeStorageFile(supabase: any, path: unknown) {
  if (typeof path !== 'string' || !path) {
    return Promise.resolve();
  }

  return supabase.storage.from(CORE_DOCUMENTS_BUCKET).remove([path]);
}

function extractRelations(body: Record<string, any>): DocumentRelation[] {
  const rawRelations = Array.isArray(body.relations) ? body.relations : [];
  const relations = rawRelations
    .map((relation: Record<string, any>) => ({
      entity_type: relation.entity_type ?? relation.entityType,
      entity_id: relation.entity_id ?? relation.entityId,
    }))
    .filter((relation) => relation.entity_type && relation.entity_id);

  const entityType = body.entity_type ?? body.entityType;
  const entityId = body.entity_id ?? body.entityId;
  if (entityType && entityId) {
    relations.unshift({ entity_type: entityType, entity_id: entityId });
  }

  const unique = new Map<string, DocumentRelation>();
  relations.forEach((relation) => {
    unique.set(`${relation.entity_type}:${relation.entity_id}`, relation);
  });

  return Array.from(unique.values());
}

function normalizeFileName(name: string) {
  return name.trim().replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function buildStoragePath(workspaceId: string, relation: DocumentRelation, fileName: string) {
  const safeName = normalizeFileName(fileName) || 'document';
  const extension = safeName.includes('.') ? `.${safeName.split('.').pop()}` : '';
  return `${workspaceId}/${relation.entity_type}/${relation.entity_id}/${randomUUID()}${extension}`;
}

async function parseDocumentRequest(request: Request): Promise<ParsedDocumentRequest> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');

    const rawRelations = formData.get('relations');
    let parsedRelations: unknown[] = [];
    if (typeof rawRelations === 'string' && rawRelations.trim()) {
      try {
        parsedRelations = JSON.parse(rawRelations);
      } catch {
        parsedRelations = [];
      }
    }

    const relations = Array.isArray(parsedRelations)
      ? parsedRelations
          .map((relation) => {
            const relationRecord = relation as Record<string, any>;
            return {
              entity_type: relationRecord.entity_type ?? relationRecord.entityType,
              entity_id: relationRecord.entity_id ?? relationRecord.entityId,
            };
          })
          .filter((relation: DocumentRelation) => relation.entity_type && relation.entity_id)
      : [];

    const entityType = (formData.get('entity_type') ?? formData.get('entityType'))?.toString() ?? null;
    const entityId = (formData.get('entity_id') ?? formData.get('entityId'))?.toString() ?? null;
    if (entityType && entityId) {
      relations.unshift({ entity_type: entityType, entity_id: entityId });
    }

    const unique = new Map<string, DocumentRelation>();
    relations.forEach((relation) => {
      unique.set(`${relation.entity_type}:${relation.entity_id}`, relation);
    });

    return {
      workspaceId: (formData.get('workspace_id') ?? formData.get('workspaceId'))?.toString() ?? null,
      id: (formData.get('id') ?? formData.get('document_id'))?.toString() ?? null,
      name: (formData.get('name') ?? null)?.toString() ?? null,
      description: (formData.get('description') ?? null)?.toString() ?? null,
      category: (formData.get('category') ?? null)?.toString() ?? null,
      fileUrl: (formData.get('file_url') ?? formData.get('fileUrl'))?.toString() ?? null,
      fileType: (formData.get('file_type') ?? formData.get('fileType'))?.toString() ?? null,
      fileSize: (() => {
        const value = formData.get('file_size') ?? formData.get('fileSize');
        const parsed = typeof value === 'string' ? Number(value) : null;
        return Number.isFinite(parsed ?? NaN) ? parsed : null;
      })(),
      filePath: (formData.get('file_path') ?? formData.get('filePath'))?.toString() ?? null,
      file: file instanceof File ? file : null,
      relations: Array.from(unique.values()),
    };
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return {
      workspaceId: null,
      id: null,
      name: null,
      description: null,
      category: null,
      fileUrl: null,
      fileType: null,
      fileSize: null,
      filePath: null,
      file: null,
      relations: [],
    };
  }

  return {
    workspaceId: body.workspace_id ?? body.workspaceId ?? null,
    id: body.id ?? body.document_id ?? null,
    name: body.name ?? null,
    description: body.description ?? null,
    category: body.category ?? null,
    fileUrl: body.file_url ?? body.fileUrl ?? null,
    fileType: body.file_type ?? body.fileType ?? null,
    fileSize: body.file_size ?? body.fileSize ?? null,
    filePath: body.file_path ?? body.filePath ?? null,
    file: null,
    relations: extractRelations(body),
  };
}

function relationRows(workspaceId: string, documentId: string, relations: DocumentRelation[]) {
  return relations.map((relation) => ({
    workspace_id: workspaceId,
    document_id: documentId,
    entity_type: relation.entity_type,
    entity_id: relation.entity_id,
  }));
}

async function uploadToStorage(
  supabase: any,
  workspaceId: string,
  relation: DocumentRelation,
  file: File,
) {
  const path = buildStoragePath(workspaceId, relation, file.name);
  const { error } = await supabase.storage
    .from(CORE_DOCUMENTS_BUCKET)
    .upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(CORE_DOCUMENTS_BUCKET).getPublicUrl(path);

  return {
    file_path: path,
    file_url: data.publicUrl,
    file_type: file.type || null,
    file_size: file.size,
  };
}

export const getDocumentsController = documents.get;

export const uploadDocumentController = catchAsync(async ({ request }) => {
  const payload = await parseDocumentRequest(request);
  const workspaceId = payload.workspaceId;

  if (!workspaceId) {
    return NextResponse.json({ success: false, message: 'workspace_id is required' }, { status: 400 });
  }

  if (!payload.name) {
    return NextResponse.json({ success: false, message: 'name is required' }, { status: 400 });
  }

  const relations = payload.relations.length > 0 ? payload.relations : [];
  const primaryRelation = relations[0];
  if (payload.file && !primaryRelation) {
    return NextResponse.json({ success: false, message: 'entity_type and entity_id are required when uploading a file' }, { status: 400 });
  }

  if (!primaryRelation && !payload.fileUrl) {
    return NextResponse.json({ success: false, message: 'entity_type and entity_id are required when no file_url is provided' }, { status: 400 });
  }

  const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const storageData =
    payload.file && primaryRelation
      ? await uploadToStorage(supabase, workspaceId, primaryRelation, payload.file)
      : {
          file_path: payload.filePath,
          file_url: payload.fileUrl,
          file_type: payload.fileType,
          file_size: payload.fileSize,
        };

  const documentPayload = cleanUndefined({
    workspace_id: workspaceId,
    name: payload.name,
    description: payload.description,
    category: payload.category,
    ...storageData,
    created_by: user.id,
    updated_by: user.id,
  });

  const { data: document, error: insertError } = await (supabase as any)
    .schema('core')
    .from('documents')
    .insert(documentPayload)
    .select('*')
    .single();

  if (insertError) {
    console.error('Create core documents error:', insertError);
    if (payload.file) {
      await removeStorageFile(supabase, storageData.file_path);
    }
    return NextResponse.json({ success: false, message: 'Failed to create document' }, { status: 500 });
  }

  if (relations.length > 0) {
    const { error: relationError } = await (supabase as any)
      .schema('core')
      .from('document_relations')
      .insert(relationRows(workspaceId, document.id, relations));

    if (relationError) {
      console.error('Create core document relation error:', relationError);
      await (supabase as any).schema('core').from('documents').delete().eq('id', document.id);
      await removeStorageFile(supabase, storageData.file_path);
      return NextResponse.json({ success: false, message: 'Failed to create document relation' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, message: 'Document created successfully', data: document }, { status: 201 });
});

export const updateDocumentController = catchAsync(async ({ request }) => {
  const payload = await parseDocumentRequest(request);
  const workspaceId = payload.workspaceId;

  if (!workspaceId || !payload.id) {
    return NextResponse.json({ success: false, message: 'id and workspace_id are required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { data: existingRelations, error: relationsFetchError } = await (supabase as any)
    .schema('core')
    .from('document_relations')
    .select('entity_type, entity_id')
    .eq('workspace_id', workspaceId)
    .eq('document_id', payload.id);

  if (relationsFetchError) {
    console.error('Fetch core document relations error:', relationsFetchError);
    return NextResponse.json({ success: false, message: 'Failed to load document relations' }, { status: 500 });
  }

  const { data: existingDocument, error: fetchError } = await (supabase as any)
    .schema('core')
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('id', payload.id)
    .single();

  if (fetchError) {
    console.error('Fetch core document error:', fetchError);
    return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
  }

  const effectiveRelations = payload.relations.length > 0 ? payload.relations : (existingRelations ?? []);
  const primaryRelation = effectiveRelations[0];

  if (payload.file && !primaryRelation) {
    return NextResponse.json({ success: false, message: 'Document relation is required to upload a file' }, { status: 400 });
  }

  const nextStorageData = payload.file
    ? await uploadToStorage(supabase, workspaceId, primaryRelation, payload.file)
    : cleanUndefined({
        file_path: payload.filePath ?? (existingDocument as any).file_path,
        file_url: payload.fileUrl ?? (existingDocument as any).file_url,
        file_type: payload.fileType ?? (existingDocument as any).file_type,
        file_size: payload.fileSize ?? (existingDocument as any).file_size,
      });

  const documentPayload = cleanUndefined({
    name: payload.name ?? existingDocument.name,
    description: payload.description ?? existingDocument.description,
    category: payload.category ?? existingDocument.category,
    ...nextStorageData,
    updated_by: user.id,
  });

  const { data: document, error: updateError } = await (supabase as any)
    .schema('core')
    .from('documents')
    .update(documentPayload)
    .eq('workspace_id', workspaceId)
    .eq('id', payload.id)
    .select('*')
    .single();

  if (updateError) {
    console.error('Update core documents error:', updateError);
    if (payload.file) {
      await removeStorageFile(supabase, nextStorageData.file_path);
    }
    return NextResponse.json({ success: false, message: 'Failed to update document' }, { status: 500 });
  }

  if (payload.relations.length > 0) {
    const { error: deleteRelationsError } = await (supabase as any)
      .schema('core')
      .from('document_relations')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('document_id', payload.id);

    if (deleteRelationsError) {
      console.error('Delete core document relations error:', deleteRelationsError);
      return NextResponse.json({ success: false, message: 'Failed to update document relations' }, { status: 500 });
    }

    const { error: insertRelationsError } = await (supabase as any)
      .schema('core')
      .from('document_relations')
      .insert(relationRows(workspaceId, payload.id, payload.relations));

    if (insertRelationsError) {
      console.error('Insert core document relations error:', insertRelationsError);
      return NextResponse.json({ success: false, message: 'Failed to update document relations' }, { status: 500 });
    }
  }

  if (payload.file && existingDocument.file_path && existingDocument.file_path !== nextStorageData.file_path) {
    await removeStorageFile(supabase, existingDocument.file_path);
  }

  return successDataResponse('Document updated successfully', document);
});

export const deleteDocumentController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');

  if (!id || !workspaceId) {
    return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });
  }

  const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { data: document, error: fetchError } = await (supabase as any)
    .schema('core')
    .from('documents')
    .select('file_path')
    .eq('workspace_id', workspaceId)
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Fetch core document file path error:', fetchError);
    return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
  }

  const { error: deleteError } = await (supabase as any)
    .schema('core')
    .from('documents')
    .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('workspace_id', workspaceId)
    .eq('id', id);

  if (deleteError) {
    console.error('Delete core document error:', deleteError);
    return NextResponse.json({ success: false, message: 'Failed to delete document' }, { status: 500 });
  }

  if (document?.file_path) {
    const { error: storageError } = await supabase.storage
      .from(CORE_DOCUMENTS_BUCKET)
      .remove([document.file_path as string]);

    if (storageError) {
      console.error('Delete core document storage error:', storageError);
    }
  }

  return successDataResponse('Document deleted successfully', { id });
});

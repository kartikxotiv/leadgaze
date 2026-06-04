import { createCoreControllers } from '../_shared/core-crud';

const documents = createCoreControllers({
  table: 'documents',
  relation: { table: 'document_relations', foreignKey: 'document_id' },
  label: 'Document',
  requiredCreateFields: ['workspace_id', 'entity_type', 'entity_id', 'name'],
  createPayload: (body, userId) => ({
    workspace_id: body.workspace_id ?? body.workspaceId,
    name: body.name,
    description: body.description ?? null,
    file_url: body.file_url ?? body.fileUrl ?? null,
    file_type: body.file_type ?? body.fileType ?? null,
    file_size: body.file_size ?? body.fileSize ?? null,
    category: body.category ?? null,
    created_by: userId,
    updated_by: userId,
  }),
  updatePayload: (body, userId) => ({
    name: body.name,
    description: body.description,
    file_url: body.file_url ?? body.fileUrl,
    file_type: body.file_type ?? body.fileType,
    file_size: body.file_size ?? body.fileSize,
    category: body.category,
    updated_by: userId,
  }),
});

export const getDocumentsController = documents.get;
export const uploadDocumentController = documents.create;
export const updateDocumentController = documents.update;
export const deleteDocumentController = documents.remove;

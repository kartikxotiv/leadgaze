import { createCoreControllers } from '../_shared/core-crud';

const notes = createCoreControllers({
  table: 'notes',
  relation: { table: 'note_relations', foreignKey: 'note_id' },
  label: 'Note',
  requiredCreateFields: ['workspace_id', 'entity_type', 'entity_id', 'note'],
  createPayload: (body, userId) => ({
    workspace_id: body.workspace_id ?? body.workspaceId,
    note: body.note,
    created_by: userId,
    updated_by: userId,
  }),
  updatePayload: (body, userId) => {
    const payload: any = {};
    if (body.note !== undefined) {
      payload.note = body.note;
    }
    if (body.is_closed !== undefined) {
      payload.is_closed = body.is_closed;
      if (body.is_closed) {
        payload.closed_at = new Date().toISOString();
        payload.closed_by = userId;
      } else {
        payload.closed_at = null;
        payload.closed_by = null;
      }
    }
    payload.updated_by = userId;
    return payload;
  },
});

export const getNotesController = notes.get;
export const createNoteController = notes.create;
export const updateNoteController = notes.update;
export const deleteNoteController = notes.remove;

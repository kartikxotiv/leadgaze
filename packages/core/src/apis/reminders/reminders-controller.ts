import { createCoreControllers } from '../_shared/core-crud';

const reminders = createCoreControllers({
  table: 'reminders',
  relation: { table: 'reminder_relations', foreignKey: 'reminder_id' },
  label: 'Reminder',
  requiredCreateFields: ['workspace_id', 'entity_type', 'entity_id', 'title'],
  defaultOrder: { column: 'due_at', ascending: true },
  createPayload: (body, userId) => ({
    workspace_id: body.workspace_id ?? body.workspaceId,
    title: body.title,
    description: body.description ?? null,
    due_at: body.due_at ?? body.dueAt ?? null,
    priority: body.priority ?? 'medium',
    status: body.status ?? 'open',
    created_by: userId,
    updated_by: userId,
  }),
  updatePayload: (body, userId) => ({
    title: body.title,
    description: body.description,
    due_at: body.due_at ?? body.dueAt,
    priority: body.priority,
    status: body.status,
    completed_at: body.completed_at ?? body.completedAt,
    completed_by: body.status === 'completed' ? userId : undefined,
    updated_by: userId,
  }),
});

export const getRemindersController = reminders.get;
export const createReminderController = reminders.create;
export const updateReminderController = reminders.update;
export const completeReminderController = reminders.update;
export const deleteReminderController = reminders.remove;

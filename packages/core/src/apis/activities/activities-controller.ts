import { createCoreControllers } from '../_shared/core-crud';

const activities = createCoreControllers({
  table: 'activities',
  label: 'Activity',
  requiredCreateFields: ['workspace_id', 'entity_type', 'entity_id', 'activity_type', 'title'],
  softDelete: false,
  createPayload: (body, userId) => ({
    workspace_id: body.workspace_id ?? body.workspaceId,
    entity_type: body.entity_type ?? body.entityType,
    entity_id: body.entity_id ?? body.entityId,
    activity_type: body.activity_type ?? body.activityType,
    title: body.title,
    description: body.description ?? null,
    metadata: body.metadata ?? {},
    created_by: userId,
  }),
  updatePayload: (body) => ({
    activity_type: body.activity_type ?? body.activityType,
    title: body.title,
    description: body.description,
    metadata: body.metadata,
  }),
});

export const getActivitiesController = activities.get;
export const logActivityController = activities.create;
export const updateActivityController = activities.update;
export const deleteActivityController = activities.remove;

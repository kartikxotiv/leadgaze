import { createCoreControllers } from '../_shared/core-crud';

const meetings = createCoreControllers({
  table: 'meetings',
  relation: { table: 'meeting_relations', foreignKey: 'meeting_id' },
  label: 'Meeting',
  requiredCreateFields: ['workspace_id', 'entity_type', 'entity_id', 'title'],
  defaultOrder: { column: 'start_time', ascending: false },
  createPayload: (body, userId) => ({
    workspace_id: body.workspace_id ?? body.workspaceId,
    title: body.title,
    description: body.description ?? null,
    start_time: body.start_time ?? body.startTime ?? null,
    end_time: body.end_time ?? body.endTime ?? null,
    location: body.location ?? null,
    status: body.status ?? 'scheduled',
    created_by: userId,
    updated_by: userId,
  }),
  updatePayload: (body, userId) => ({
    title: body.title,
    description: body.description,
    start_time: body.start_time ?? body.startTime,
    end_time: body.end_time ?? body.endTime,
    location: body.location,
    status: body.status,
    updated_by: userId,
  }),
});

export const getMeetingsController = meetings.get;
export const createMeetingController = meetings.create;
export const updateMeetingController = meetings.update;
export const cancelMeetingController = meetings.update;
export const deleteMeetingController = meetings.remove;

export type CoreEntityRef = {
  workspaceId: string;
  entityType: string;
  entityId: string;
};

export type CoreRelation = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
};

export type CoreNote = {
  id: string;
  workspace_id: string;
  entity_type: string | null;
  entity_id: string | null;
  relations: Array<CoreRelation & { note_id?: string }>;
  note: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CoreMeeting = {
  id: string;
  workspace_id: string;
  entity_type: string | null;
  entity_id: string | null;
  relations: Array<CoreRelation & { meeting_id?: string }>;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CoreEmail = {
  id: string;
  workspace_id: string;
  entity_type: string | null;
  entity_id: string | null;
  relations: Array<CoreRelation & { email_id?: string }>;
  thread_id: string | null;
  direction: string;
  from_email: string | null;
  to_email: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  body: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CoreDocument = {
  id: string;
  workspace_id: string;
  entity_type: string | null;
  entity_id: string | null;
  relations: Array<CoreRelation & { document_id?: string }>;
  name: string;
  description: string | null;
  file_path: string | null;
  file_url: string | null;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type CoreActivity = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CoreReminder = {
  id: string;
  workspace_id: string;
  entity_type: string | null;
  entity_id: string | null;
  relations: Array<CoreRelation & { reminder_id?: string }>;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE activity_related_type AS ENUM (
  'lead', 'deal', 'contact', 'company'
);

CREATE TYPE activity_type AS ENUM (
  'call', 'email', 'linkedin', 'meeting', 'task', 'note', 'demo',
  'proposal_sent', 'lead_created', 'lead_updated', 'status_changed',
  'score_updated', 'deal_created', 'deal_moved', 'task_created',
  'task_completed', 'follow_up_scheduled'
);

CREATE TYPE deal_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE deal_stage AS ENUM (
  'qualification', 'proposal', 'negotiation', 'decision',
  'closed_won', 'closed_lost'
);

-- Repeat for all your ENUMs as shown in your JS migration...

-- Creating indexes
CREATE INDEX IF NOT EXISTS activities_created_idx ON public.activities (created_at);
CREATE INDEX IF NOT EXISTS activities_due_idx ON public.activities (due_date);
CREATE INDEX IF NOT EXISTS activities_related_idx ON public.activities (related_type, related_id);
CREATE INDEX IF NOT EXISTS activities_sched_idx ON public.activities (scheduled_at);
CREATE INDEX IF NOT EXISTS activities_type_idx ON public.activities (activity_type);
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON public.activities (user_id);

CREATE INDEX IF NOT EXISTS deals_created_at_idx ON public.deals (created_at);
CREATE INDEX IF NOT EXISTS deals_expected_close_date_idx ON public.deals (expected_close_date);
CREATE INDEX IF NOT EXISTS deals_lead_id_idx ON public.deals (lead_id);
CREATE INDEX IF NOT EXISTS deals_organization_id_idx ON public.deals (organization_id);
CREATE INDEX IF NOT EXISTS deals_stage_idx ON public.deals (stage);
CREATE INDEX IF NOT EXISTS deals_user_id_idx ON public.deals (user_id);

CREATE INDEX IF NOT EXISTS email_otps_email ON public.email_otps (email);
CREATE UNIQUE INDEX IF NOT EXISTS email_otps_email_otp_purpose ON public.email_otps (email, otp, purpose);
CREATE INDEX IF NOT EXISTS email_otps_email_purpose ON public.email_otps (email, purpose);
CREATE INDEX IF NOT EXISTS email_otps_expires_at ON public.email_otps (expires_at);

CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON public.automation_rules (is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_org ON public.automation_rules (organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_priority ON public.automation_rules (priority);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON public.automation_rules (trigger);
CREATE INDEX IF NOT EXISTS idx_automation_rules_triggered ON public.automation_rules (last_triggered);

CREATE INDEX IF NOT EXISTS idx_lead_scores_calculated ON public.lead_scores (last_calculated);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON public.lead_scores (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_org ON public.lead_scores (organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_score ON public.lead_scores (total_score);
CREATE INDEX IF NOT EXISTS idx_lead_scores_tier ON public.lead_scores (tier);

CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON public.notifications (expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications (organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications (priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON public.notifications (related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_org_user_accounts_email ON public.org_user_accounts (email);
CREATE INDEX IF NOT EXISTS idx_org_user_accounts_org ON public.org_user_accounts (organization_id);

CREATE INDEX IF NOT EXISTS idx_scoring_rules_active ON public.scoring_rules (is_active);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_org ON public.scoring_rules (organization_id);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_priority ON public.scoring_rules (priority);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_type ON public.scoring_rules (rule_type);

CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON public.leads (assigned_to);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at);
CREATE INDEX IF NOT EXISTS leads_created_by_idx ON public.leads (created_by);
CREATE INDEX IF NOT EXISTS leads_email_idx ON public.leads (email);
CREATE INDEX IF NOT EXISTS leads_industry_id_idx ON public.leads (industry_id);
CREATE INDEX IF NOT EXISTS leads_lead_score_idx ON public.leads (lead_score);
CREATE INDEX IF NOT EXISTS leads_next_followup_idx ON public.leads (next_followup_date);
CREATE INDEX IF NOT EXISTS leads_org_idx ON public.leads (organization_id);
CREATE INDEX IF NOT EXISTS leads_score_grade_id_idx ON public.leads (score_grade_id);
CREATE INDEX IF NOT EXISTS leads_source_id_idx ON public.leads (source_id);
CREATE INDEX IF NOT EXISTS leads_status_id_idx ON public.leads (status_id);

CREATE INDEX IF NOT EXISTS leads_config_display_order ON public.leads_config (display_order);
CREATE INDEX IF NOT EXISTS leads_config_entity_type ON public.leads_config (entity_type);
CREATE INDEX IF NOT EXISTS leads_config_is_active ON public.leads_config (is_active);

CREATE INDEX IF NOT EXISTS prt_expires_at_idx ON public.password_reset_tokens (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS prt_token_uq ON public.password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS prt_user_id_idx ON public.password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to);
CREATE INDEX IF NOT EXISTS tasks_deal_id_idx ON public.tasks (deal_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS tasks_lead_id_idx ON public.tasks (lead_id);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON public.tasks (priority);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (status);


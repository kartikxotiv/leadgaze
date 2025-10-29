-- Cleanup migration: Drop all objects from old migrations
-- This allows the new migrations to apply cleanly

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.lead_scores CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.automation_rules CASCADE;
DROP TABLE IF EXISTS public.scoring_rules CASCADE;
DROP TABLE IF EXISTS public.org_user_accounts CASCADE;
DROP TABLE IF EXISTS public.organization_workspaces CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.user_invitations CASCADE;
DROP TABLE IF EXISTS public.user_organizations CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.email_verifications CASCADE;
DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.email_otps CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organization_roles CASCADE;
DROP TABLE IF EXISTS public.organization_config CASCADE;
DROP TABLE IF EXISTS public.leads_config CASCADE;
DROP TABLE IF EXISTS public.users_config CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.prt_sync_reset_token() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS prt_sync_reset_token_trg ON public.password_reset_tokens;

-- Drop all enum types
DROP TYPE IF EXISTS public.activity_related_type CASCADE;
DROP TYPE IF EXISTS public.activity_type CASCADE;
DROP TYPE IF EXISTS public.deal_priority CASCADE;
DROP TYPE IF EXISTS public.deal_stage CASCADE;
DROP TYPE IF EXISTS public.enum_activities_outcome CASCADE;
DROP TYPE IF EXISTS public.enum_activities_type CASCADE;
DROP TYPE IF EXISTS public.enum_deals_deal_status CASCADE;
DROP TYPE IF EXISTS public.enum_deals_status CASCADE;
DROP TYPE IF EXISTS public.enum_email_otps_purpose CASCADE;
DROP TYPE IF EXISTS public.enum_leads_company_size CASCADE;
DROP TYPE IF EXISTS public.enum_leads_priority CASCADE;
DROP TYPE IF EXISTS public.enum_leads_source CASCADE;
DROP TYPE IF EXISTS public.enum_leads_status CASCADE;
DROP TYPE IF EXISTS public.enum_leads_type CASCADE;
DROP TYPE IF EXISTS public.enum_organizations_company_size CASCADE;
DROP TYPE IF EXISTS public.enum_organizations_plan_type CASCADE;
DROP TYPE IF EXISTS public.enum_organizations_status CASCADE;
DROP TYPE IF EXISTS public.enum_organizations_subscription_status CASCADE;
DROP TYPE IF EXISTS public.enum_tasks_priority CASCADE;
DROP TYPE IF EXISTS public.enum_tasks_status CASCADE;
DROP TYPE IF EXISTS public.enum_tasks_type CASCADE;
DROP TYPE IF EXISTS public.enum_user_organizations_role CASCADE;
DROP TYPE IF EXISTS public.enum_user_organizations_status CASCADE;
DROP TYPE IF EXISTS public.enum_users_status CASCADE;
DROP TYPE IF EXISTS public.task_priority CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.task_type CASCADE;


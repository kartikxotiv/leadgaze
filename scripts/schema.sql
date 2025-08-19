--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 15.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: sidharthverma
--

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: activity_related_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activity_related_type AS ENUM (
    'lead',
    'deal',
    'contact',
    'company'
);


ALTER TYPE public.activity_related_type OWNER TO postgres;

--
-- Name: activity_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activity_type AS ENUM (
    'call',
    'email',
    'linkedin',
    'meeting',
    'task',
    'note',
    'demo',
    'proposal_sent',
    'lead_created',
    'lead_updated',
    'status_changed',
    'score_updated',
    'deal_created',
    'deal_moved',
    'task_created',
    'task_completed',
    'follow_up_scheduled'
);


ALTER TYPE public.activity_type OWNER TO postgres;

--
-- Name: deal_priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.deal_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE public.deal_priority OWNER TO postgres;

--
-- Name: deal_stage; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.deal_stage AS ENUM (
    'qualification',
    'proposal',
    'negotiation',
    'decision',
    'closed_won',
    'closed_lost'
);


ALTER TYPE public.deal_stage OWNER TO postgres;

--
-- Name: enum_activities_outcome; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_activities_outcome AS ENUM (
    'positive',
    'neutral',
    'negative',
    'follow_up'
);


ALTER TYPE public.enum_activities_outcome OWNER TO crm_user;

--
-- Name: enum_activities_type; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_activities_type AS ENUM (
    'call',
    'email',
    'meeting',
    'note',
    'task',
    'deal_update'
);


ALTER TYPE public.enum_activities_type OWNER TO crm_user;

--
-- Name: enum_deals_deal_status; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_deals_deal_status AS ENUM (
    'open',
    'won',
    'lost',
    'on_hold'
);


ALTER TYPE public.enum_deals_deal_status OWNER TO crm_user;

--
-- Name: enum_deals_status; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_deals_status AS ENUM (
    'open',
    'won',
    'lost',
    'cancelled'
);


ALTER TYPE public.enum_deals_status OWNER TO crm_user;

--
-- Name: enum_email_otps_purpose; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_email_otps_purpose AS ENUM (
    'signup',
    'password_reset',
    'login'
);


ALTER TYPE public.enum_email_otps_purpose OWNER TO crm_user;

--
-- Name: enum_leads_company_size; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_leads_company_size AS ENUM (
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '500+'
);


ALTER TYPE public.enum_leads_company_size OWNER TO crm_user;

--
-- Name: enum_leads_priority; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_leads_priority AS ENUM (
    'High',
    'Medium',
    'Low'
);


ALTER TYPE public.enum_leads_priority OWNER TO crm_user;

--
-- Name: enum_leads_source; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_leads_source AS ENUM (
    'Website',
    'Referral',
    'Cold Call',
    'LinkedIn',
    'Email',
    'Trade Show',
    'Advertisement'
);


ALTER TYPE public.enum_leads_source OWNER TO crm_user;

--
-- Name: enum_leads_status; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_leads_status AS ENUM (
    'New',
    'Contacted',
    'Qualified',
    'Converted',
    'Disqualified'
);


ALTER TYPE public.enum_leads_status OWNER TO crm_user;

--
-- Name: enum_leads_type; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_leads_type AS ENUM (
    'Hot',
    'Warm',
    'Cold'
);


ALTER TYPE public.enum_leads_type OWNER TO crm_user;

--
-- Name: enum_organizations_company_size; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_organizations_company_size AS ENUM (
    'solo',
    'small',
    'medium',
    'large',
    'enterprise'
);


ALTER TYPE public.enum_organizations_company_size OWNER TO crm_user;

--
-- Name: enum_organizations_plan_type; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_organizations_plan_type AS ENUM (
    'trial',
    'basic',
    'pro',
    'enterprise'
);


ALTER TYPE public.enum_organizations_plan_type OWNER TO crm_user;

--
-- Name: enum_organizations_status; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_organizations_status AS ENUM (
    'active',
    'inactive',
    'suspended'
);


ALTER TYPE public.enum_organizations_status OWNER TO crm_user;

--
-- Name: enum_organizations_subscription_status; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_organizations_subscription_status AS ENUM (
    'trial',
    'active',
    'cancelled',
    'past_due',
    'unpaid'
);


ALTER TYPE public.enum_organizations_subscription_status OWNER TO crm_user;

--
-- Name: enum_tasks_priority; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_tasks_priority AS ENUM (
    'Low',
    'Medium',
    'High',
    'Urgent'
);


ALTER TYPE public.enum_tasks_priority OWNER TO crm_user;

--
-- Name: enum_tasks_status; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_tasks_status AS ENUM (
    'Pending',
    'In Progress',
    'Completed',
    'Cancelled'
);


ALTER TYPE public.enum_tasks_status OWNER TO crm_user;

--
-- Name: enum_tasks_type; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_tasks_type AS ENUM (
    'Call',
    'Email',
    'Meeting',
    'Follow-up',
    'Other'
);


ALTER TYPE public.enum_tasks_type OWNER TO crm_user;

--
-- Name: enum_user_organizations_role; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_user_organizations_role AS ENUM (
    'owner',
    'admin',
    'manager',
    'viewer'
);


ALTER TYPE public.enum_user_organizations_role OWNER TO crm_user;

--
-- Name: enum_user_organizations_status; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_user_organizations_status AS ENUM (
    'active',
    'inactive',
    'pending'
);


ALTER TYPE public.enum_user_organizations_status OWNER TO crm_user;

--
-- Name: enum_users_status; Type: TYPE; Schema: public; Owner: sidharthverma
--

CREATE TYPE public.enum_users_status AS ENUM (
    'active',
    'inactive',
    'suspended'
);


ALTER TYPE public.enum_users_status OWNER TO crm_user;

--
-- Name: task_priority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_priority AS ENUM (
    'Low',
    'Medium',
    'High',
    'Urgent'
);


ALTER TYPE public.task_priority OWNER TO postgres;

--
-- Name: task_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_status AS ENUM (
    'Pending',
    'In Progress',
    'Completed',
    'Cancelled'
);


ALTER TYPE public.task_status OWNER TO postgres;

--
-- Name: task_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.task_type AS ENUM (
    'Task',
    'Call',
    'Email',
    'Meeting',
    'Note'
);


ALTER TYPE public.task_type OWNER TO postgres;

--
-- Name: prt_sync_reset_token(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prt_sync_reset_token() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.reset_token IS NULL THEN
    NEW.reset_token := NEW.token;
  END IF;
  RETURN NEW;
END$$;


ALTER FUNCTION public.prt_sync_reset_token() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: sidharthverma
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO crm_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    activity_id uuid DEFAULT gen_random_uuid() NOT NULL,
    activity_type public.activity_type NOT NULL,
    related_type public.activity_related_type NOT NULL,
    related_id uuid NOT NULL,
    subject character varying(255) NOT NULL,
    description text,
    outcome character varying(100),
    direction character varying(8),
    duration_minutes integer,
    scheduled_at timestamp with time zone,
    completed_at timestamp with time zone,
    due_date timestamp with time zone,
    priority public.deal_priority DEFAULT 'medium'::public.deal_priority NOT NULL,
    user_id uuid NOT NULL,
    next_followup_date timestamp with time zone,
    file_url character varying(500),
    file_name character varying(255),
    file_type character varying(50),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT activities_direction_check CHECK (((direction)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[]))),
    CONSTRAINT activities_duration_minutes_check CHECK ((duration_minutes >= 0))
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: automation_rules; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.automation_rules (
    rule_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    trigger character varying(50) NOT NULL,
    conditions jsonb NOT NULL,
    actions jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    last_triggered timestamp with time zone,
    trigger_count integer DEFAULT 0 NOT NULL,
    organization_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT automation_rules_trigger_check CHECK (((trigger)::text = ANY ((ARRAY['lead_created'::character varying, 'lead_updated'::character varying, 'lead_score_changed'::character varying, 'lead_stale'::character varying, 'deal_created'::character varying, 'deal_moved'::character varying, 'deal_stuck'::character varying, 'task_created'::character varying, 'task_overdue'::character varying, 'activity_logged'::character varying, 'follow_up_due'::character varying, 'time_based'::character varying])::text[])))
);


ALTER TABLE public.automation_rules OWNER TO crm_user;

--
-- Name: deals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deals (
    deal_id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    value numeric(12,2) DEFAULT 0.00 NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    stage public.deal_stage DEFAULT 'qualification'::public.deal_stage NOT NULL,
    probability integer DEFAULT 10 NOT NULL,
    source character varying(100),
    priority public.deal_priority DEFAULT 'medium'::public.deal_priority NOT NULL,
    expected_close_date timestamp with time zone,
    actual_close_date timestamp with time zone,
    lost_reason character varying(255),
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT deals_probability_check CHECK (((probability >= 0) AND (probability <= 100)))
);


ALTER TABLE public.deals OWNER TO postgres;

--
-- Name: email_otps; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.email_otps (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    otp character varying(6) NOT NULL,
    purpose public.enum_email_otps_purpose DEFAULT 'signup'::public.enum_email_otps_purpose NOT NULL,
    attempts integer DEFAULT 0,
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE public.email_otps OWNER TO crm_user;

--
-- Name: email_verifications; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.email_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    verification_token character varying(500) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.email_verifications OWNER TO crm_user;

--
-- Name: lead_scores; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.lead_scores (
    score_id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    total_score integer DEFAULT 0 NOT NULL,
    tier character varying(20) DEFAULT 'cold'::character varying NOT NULL,
    last_calculated timestamp with time zone DEFAULT now() NOT NULL,
    score_breakdown jsonb,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT lead_scores_tier_check CHECK (((tier)::text = ANY ((ARRAY['cold'::character varying, 'warm'::character varying, 'hot'::character varying, 'burning'::character varying])::text[])))
);


ALTER TABLE public.lead_scores OWNER TO crm_user;

--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    lead_id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(255),
    alt_email character varying(255),
    phone character varying(20),
    alt_phone character varying(20),
    linkedin_profile character varying(500),
    business_name character varying(255),
    company_website character varying(500),
    meta_data jsonb,
    source_id uuid NOT NULL,
    industry_id uuid,
    company_size_id uuid,
    product_interest text,
    tags jsonb DEFAULT '[]'::jsonb,
    status_id uuid NOT NULL,
    assigned_to uuid,
    created_by uuid NOT NULL,
    lead_score integer DEFAULT 0 NOT NULL,
    score_grade_id uuid,
    qualification_notes text,
    last_contact_date timestamp with time zone,
    next_followup_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    job_title character varying(100),
    CONSTRAINT leads_lead_score_check CHECK ((lead_score >= 0))
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: leads_config; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.leads_config (
    id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_value character varying(100) NOT NULL,
    description text,
    display_order integer DEFAULT 0,
    metadata jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.leads_config OWNER TO crm_user;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    channel character varying(20) DEFAULT 'in_app'::character varying NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    action_url character varying(500),
    action_label character varying(100),
    related_type character varying(20),
    related_id uuid,
    organization_id uuid NOT NULL,
    sent_at timestamp with time zone,
    expires_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_channel_check CHECK (((channel)::text = ANY ((ARRAY['in_app'::character varying, 'email'::character varying, 'slack'::character varying, 'sms'::character varying])::text[]))),
    CONSTRAINT notifications_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT notifications_related_type_check CHECK (((related_type)::text = ANY ((ARRAY['lead'::character varying, 'deal'::character varying, 'task'::character varying, 'activity'::character varying, 'user'::character varying])::text[]))),
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['lead_assigned'::character varying, 'follow_up_due'::character varying, 'lead_stale'::character varying, 'lead_scored_high'::character varying, 'deal_moved'::character varying, 'deal_stuck'::character varying, 'task_overdue'::character varying, 'activity_reminder'::character varying, 'system_update'::character varying, 'bulk_import_complete'::character varying, 'escalation'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO crm_user;

--
-- Name: org_user_accounts; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.org_user_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.org_user_accounts OWNER TO crm_user;

--
-- Name: organization_config; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.organization_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_value character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    config_data jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.organization_config OWNER TO crm_user;

--
-- Name: organization_roles; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.organization_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    hierarchy_level integer DEFAULT 0 NOT NULL,
    is_system_role boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.organization_roles OWNER TO crm_user;

--
-- Name: organization_workspaces; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.organization_workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    status_id uuid,
    created_by uuid NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.organization_workspaces OWNER TO crm_user;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.organizations (
    organization_id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    description text,
    industry_type character varying(100),
    company_size_config_id uuid,
    primary_use_case character varying(255),
    current_tool character varying(255),
    logo_url character varying(500),
    website character varying(255),
    address text,
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100),
    phone character varying(20),
    created_by uuid,
    status_id uuid,
    subscription_status_id uuid,
    plan_type_id uuid,
    trial_starts_at timestamp with time zone,
    trial_ends_at timestamp with time zone,
    subscription_starts_at timestamp with time zone,
    subscription_ends_at timestamp with time zone,
    billing_email character varying(255),
    max_users integer DEFAULT 5,
    max_workspaces integer DEFAULT 3,
    max_storage_gb integer DEFAULT 10,
    features_enabled jsonb DEFAULT '[]'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.organizations OWNER TO crm_user;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reset_token character varying(500),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reseted_at timestamp with time zone,
    token character varying(255)
);


ALTER TABLE public.password_reset_tokens OWNER TO crm_user;

--
-- Name: scoring_rules; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.scoring_rules (
    rule_id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_name character varying(255) NOT NULL,
    rule_type character varying(50) NOT NULL,
    condition jsonb NOT NULL,
    points integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 1 NOT NULL,
    description text,
    organization_id uuid NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scoring_rules_points_check CHECK (((points >= '-100'::integer) AND (points <= 100))),
    CONSTRAINT scoring_rules_rule_type_check CHECK (((rule_type)::text = ANY ((ARRAY['activity_response'::character varying, 'email_interaction'::character varying, 'quotation_request'::character varying, 'no_response_penalty'::character varying, 'icp_match'::character varying, 'lead_source'::character varying, 'company_size'::character varying, 'job_title_match'::character varying, 'industry_match'::character varying, 'custom'::character varying])::text[])))
);


ALTER TABLE public.scoring_rules OWNER TO crm_user;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    task_id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    type public.task_type DEFAULT 'Task'::public.task_type NOT NULL,
    priority public.task_priority DEFAULT 'Medium'::public.task_priority NOT NULL,
    status public.task_status DEFAULT 'Pending'::public.task_status NOT NULL,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    lead_id uuid,
    deal_id uuid,
    assigned_to uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: user_invitations; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.user_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    role_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    status_id uuid NOT NULL,
    invitation_token character varying(500) NOT NULL,
    message text,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    accepted_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_invitations OWNER TO crm_user;

--
-- Name: user_organizations; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.user_organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    role_id uuid NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    joined_at timestamp with time zone DEFAULT now(),
    invited_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_organizations OWNER TO crm_user;

--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_organization_id uuid,
    session_token character varying(500),
    refresh_token character varying(500),
    expires_at timestamp with time zone,
    last_activity_at timestamp with time zone DEFAULT now(),
    ip_address inet,
    user_agent text,
    device_info jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_sessions OWNER TO crm_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.users (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    phone_number character varying(20),
    email_verified boolean DEFAULT false,
    status_id uuid,
    last_visited_organization_id uuid,
    last_login timestamp with time zone,
    login_attempts integer DEFAULT 0,
    lock_until timestamp with time zone,
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    password_changed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO crm_user;

--
-- Name: users_config; Type: TABLE; Schema: public; Owner: sidharthverma
--

CREATE TABLE public.users_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_value character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users_config OWNER TO crm_user;

--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (activity_id);


--
-- Name: automation_rules automation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.automation_rules
    ADD CONSTRAINT automation_rules_pkey PRIMARY KEY (rule_id);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (deal_id);


--
-- Name: email_otps email_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.email_otps
    ADD CONSTRAINT email_otps_pkey PRIMARY KEY (id);


--
-- Name: email_verifications email_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_pkey PRIMARY KEY (id);


--
-- Name: email_verifications email_verifications_verification_token_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_verification_token_key UNIQUE (verification_token);


--
-- Name: lead_scores lead_scores_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.lead_scores
    ADD CONSTRAINT lead_scores_lead_id_key UNIQUE (lead_id);


--
-- Name: lead_scores lead_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.lead_scores
    ADD CONSTRAINT lead_scores_pkey PRIMARY KEY (score_id);


--
-- Name: leads_config leads_config_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.leads_config
    ADD CONSTRAINT leads_config_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (lead_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: org_user_accounts org_user_accounts_org_email_unique; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.org_user_accounts
    ADD CONSTRAINT org_user_accounts_org_email_unique UNIQUE (organization_id, email);


--
-- Name: org_user_accounts org_user_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.org_user_accounts
    ADD CONSTRAINT org_user_accounts_pkey PRIMARY KEY (id);


--
-- Name: organization_config organization_config_entity_type_entity_value_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_config
    ADD CONSTRAINT organization_config_entity_type_entity_value_key UNIQUE (entity_type, entity_value);


--
-- Name: organization_config organization_config_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_config
    ADD CONSTRAINT organization_config_pkey PRIMARY KEY (id);


--
-- Name: organization_roles organization_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_roles
    ADD CONSTRAINT organization_roles_pkey PRIMARY KEY (id);


--
-- Name: organization_roles organization_roles_role_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_roles
    ADD CONSTRAINT organization_roles_role_key UNIQUE (role);


--
-- Name: organization_workspaces organization_workspaces_organization_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_workspaces
    ADD CONSTRAINT organization_workspaces_organization_id_slug_key UNIQUE (organization_id, slug);


--
-- Name: organization_workspaces organization_workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_workspaces
    ADD CONSTRAINT organization_workspaces_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (organization_id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_reset_token_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_reset_token_key UNIQUE (reset_token);


--
-- Name: scoring_rules scoring_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.scoring_rules
    ADD CONSTRAINT scoring_rules_pkey PRIMARY KEY (rule_id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (task_id);


--
-- Name: user_invitations user_invitations_invitation_token_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_invitation_token_key UNIQUE (invitation_token);


--
-- Name: user_invitations user_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);


--
-- Name: user_organizations user_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_pkey PRIMARY KEY (id);


--
-- Name: user_organizations user_organizations_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_user_id_organization_id_key UNIQUE (user_id, organization_id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users_config users_config_entity_type_entity_value_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.users_config
    ADD CONSTRAINT users_config_entity_type_entity_value_key UNIQUE (entity_type, entity_value);


--
-- Name: users_config users_config_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.users_config
    ADD CONSTRAINT users_config_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: activities_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activities_created_idx ON public.activities USING btree (created_at);


--
-- Name: activities_due_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activities_due_idx ON public.activities USING btree (due_date);


--
-- Name: activities_related_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activities_related_idx ON public.activities USING btree (related_type, related_id);


--
-- Name: activities_sched_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activities_sched_idx ON public.activities USING btree (scheduled_at);


--
-- Name: activities_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activities_type_idx ON public.activities USING btree (activity_type);


--
-- Name: activities_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activities_user_id_idx ON public.activities USING btree (user_id);


--
-- Name: deals_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_created_at_idx ON public.deals USING btree (created_at);


--
-- Name: deals_expected_close_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_expected_close_date_idx ON public.deals USING btree (expected_close_date);


--
-- Name: deals_lead_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_lead_id_idx ON public.deals USING btree (lead_id);


--
-- Name: deals_organization_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_organization_id_idx ON public.deals USING btree (organization_id);


--
-- Name: deals_stage_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_stage_idx ON public.deals USING btree (stage);


--
-- Name: deals_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_user_id_idx ON public.deals USING btree (user_id);


--
-- Name: email_otps_email; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX email_otps_email ON public.email_otps USING btree (email);


--
-- Name: email_otps_email_otp_purpose; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE UNIQUE INDEX email_otps_email_otp_purpose ON public.email_otps USING btree (email, otp, purpose);


--
-- Name: email_otps_email_purpose; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX email_otps_email_purpose ON public.email_otps USING btree (email, purpose);


--
-- Name: email_otps_expires_at; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX email_otps_expires_at ON public.email_otps USING btree (expires_at);


--
-- Name: idx_automation_rules_active; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_automation_rules_active ON public.automation_rules USING btree (is_active);


--
-- Name: idx_automation_rules_org; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_automation_rules_org ON public.automation_rules USING btree (organization_id);


--
-- Name: idx_automation_rules_priority; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_automation_rules_priority ON public.automation_rules USING btree (priority);


--
-- Name: idx_automation_rules_trigger; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_automation_rules_trigger ON public.automation_rules USING btree (trigger);


--
-- Name: idx_automation_rules_triggered; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_automation_rules_triggered ON public.automation_rules USING btree (last_triggered);


--
-- Name: idx_lead_scores_calculated; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_lead_scores_calculated ON public.lead_scores USING btree (last_calculated);


--
-- Name: idx_lead_scores_lead; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_lead_scores_lead ON public.lead_scores USING btree (lead_id);


--
-- Name: idx_lead_scores_org; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_lead_scores_org ON public.lead_scores USING btree (organization_id);


--
-- Name: idx_lead_scores_score; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_lead_scores_score ON public.lead_scores USING btree (total_score);


--
-- Name: idx_lead_scores_tier; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_lead_scores_tier ON public.lead_scores USING btree (tier);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_expires; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_notifications_expires ON public.notifications USING btree (expires_at);


--
-- Name: idx_notifications_org; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_notifications_org ON public.notifications USING btree (organization_id);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (priority);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (is_read);


--
-- Name: idx_notifications_related; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_notifications_related ON public.notifications USING btree (related_type, related_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);


--
-- Name: idx_org_user_accounts_email; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_org_user_accounts_email ON public.org_user_accounts USING btree (email);


--
-- Name: idx_org_user_accounts_org; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_org_user_accounts_org ON public.org_user_accounts USING btree (organization_id);


--
-- Name: idx_scoring_rules_active; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_scoring_rules_active ON public.scoring_rules USING btree (is_active);


--
-- Name: idx_scoring_rules_org; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_scoring_rules_org ON public.scoring_rules USING btree (organization_id);


--
-- Name: idx_scoring_rules_priority; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_scoring_rules_priority ON public.scoring_rules USING btree (priority);


--
-- Name: idx_scoring_rules_type; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX idx_scoring_rules_type ON public.scoring_rules USING btree (rule_type);


--
-- Name: leads_assigned_to_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_assigned_to_idx ON public.leads USING btree (assigned_to);


--
-- Name: leads_config_display_order; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX leads_config_display_order ON public.leads_config USING btree (display_order);


--
-- Name: leads_config_entity_type; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX leads_config_entity_type ON public.leads_config USING btree (entity_type);


--
-- Name: leads_config_entity_type_entity_value; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE UNIQUE INDEX leads_config_entity_type_entity_value ON public.leads_config USING btree (entity_type, entity_value);


--
-- Name: leads_config_is_active; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX leads_config_is_active ON public.leads_config USING btree (is_active);


--
-- Name: leads_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_created_at_idx ON public.leads USING btree (created_at);


--
-- Name: leads_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_created_by_idx ON public.leads USING btree (created_by);


--
-- Name: leads_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_email_idx ON public.leads USING btree (email);


--
-- Name: leads_industry_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_industry_id_idx ON public.leads USING btree (industry_id);


--
-- Name: leads_lead_score_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_lead_score_idx ON public.leads USING btree (lead_score);


--
-- Name: leads_next_followup_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_next_followup_idx ON public.leads USING btree (next_followup_date);


--
-- Name: leads_org_email_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX leads_org_email_uniq ON public.leads USING btree (organization_id, email);


--
-- Name: leads_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_org_idx ON public.leads USING btree (organization_id);


--
-- Name: leads_score_grade_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_score_grade_id_idx ON public.leads USING btree (score_grade_id);


--
-- Name: leads_source_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_source_id_idx ON public.leads USING btree (source_id);


--
-- Name: leads_status_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX leads_status_id_idx ON public.leads USING btree (status_id);


--
-- Name: prt_expires_at_idx; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX prt_expires_at_idx ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: prt_token_uq; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE UNIQUE INDEX prt_token_uq ON public.password_reset_tokens USING btree (token);


--
-- Name: prt_user_id_idx; Type: INDEX; Schema: public; Owner: sidharthverma
--

CREATE INDEX prt_user_id_idx ON public.password_reset_tokens USING btree (user_id);


--
-- Name: tasks_assigned_to_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_assigned_to_idx ON public.tasks USING btree (assigned_to);


--
-- Name: tasks_deal_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_deal_id_idx ON public.tasks USING btree (deal_id);


--
-- Name: tasks_due_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_due_date_idx ON public.tasks USING btree (due_date);


--
-- Name: tasks_lead_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_lead_id_idx ON public.tasks USING btree (lead_id);


--
-- Name: tasks_priority_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_priority_idx ON public.tasks USING btree (priority);


--
-- Name: tasks_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tasks_status_idx ON public.tasks USING btree (status);


--
-- Name: password_reset_tokens prt_sync_reset_token_trg; Type: TRIGGER; Schema: public; Owner: sidharthverma
--

CREATE TRIGGER prt_sync_reset_token_trg BEFORE INSERT OR UPDATE ON public.password_reset_tokens FOR EACH ROW EXECUTE FUNCTION public.prt_sync_reset_token();


--
-- Name: activities activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: deals deals_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(lead_id);


--
-- Name: deals deals_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: deals deals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: email_verifications email_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: leads leads_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id);


--
-- Name: leads leads_company_size_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_company_size_id_fkey FOREIGN KEY (company_size_id) REFERENCES public.leads_config(id);


--
-- Name: leads leads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: leads leads_industry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.leads_config(id);


--
-- Name: leads leads_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: leads leads_score_grade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_score_grade_id_fkey FOREIGN KEY (score_grade_id) REFERENCES public.leads_config(id);


--
-- Name: leads leads_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.leads_config(id);


--
-- Name: leads leads_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.leads_config(id);


--
-- Name: organization_workspaces organization_workspaces_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_workspaces
    ADD CONSTRAINT organization_workspaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: organization_workspaces organization_workspaces_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_workspaces
    ADD CONSTRAINT organization_workspaces_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id) ON DELETE CASCADE;


--
-- Name: organization_workspaces organization_workspaces_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organization_workspaces
    ADD CONSTRAINT organization_workspaces_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.organization_config(id);


--
-- Name: organizations organizations_company_size_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_company_size_config_id_fkey FOREIGN KEY (company_size_config_id) REFERENCES public.organization_config(id);


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: organizations organizations_plan_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_plan_type_id_fkey FOREIGN KEY (plan_type_id) REFERENCES public.organization_config(id);


--
-- Name: organizations organizations_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.organization_config(id);


--
-- Name: organizations organizations_subscription_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_subscription_status_id_fkey FOREIGN KEY (subscription_status_id) REFERENCES public.organization_config(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id);


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: tasks tasks_deal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES public.deals(deal_id);


--
-- Name: tasks tasks_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(lead_id);


--
-- Name: user_invitations user_invitations_accepted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_accepted_by_user_id_fkey FOREIGN KEY (accepted_by_user_id) REFERENCES public.users(user_id);


--
-- Name: user_invitations user_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(user_id);


--
-- Name: user_invitations user_invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id) ON DELETE CASCADE;


--
-- Name: user_invitations user_invitations_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.organization_roles(id);


--
-- Name: user_invitations user_invitations_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.users_config(id);


--
-- Name: user_organizations user_organizations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(user_id);


--
-- Name: user_organizations user_organizations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id) ON DELETE CASCADE;


--
-- Name: user_organizations user_organizations_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.organization_roles(id);


--
-- Name: user_organizations user_organizations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_current_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_current_organization_id_fkey FOREIGN KEY (current_organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: users users_last_visited_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_last_visited_organization_id_fkey FOREIGN KEY (last_visited_organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: users users_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: sidharthverma
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.users_config(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: sidharthverma
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--


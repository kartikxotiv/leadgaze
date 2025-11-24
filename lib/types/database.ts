export interface User {
  user_id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  email_verified: boolean;
  status_id?: string;
  last_visited_organization_id?: string;
  last_login?: string;
  login_attempts: number;
  lock_until?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  password_changed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  industry_type?: string;
  company_size_config_id?: string;
  primary_use_case?: string;
  current_tool?: string;
  logo_url?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  created_by: string;
  status_id?: string;
  subscription_status_id?: string;
  plan_type_id?: string;
  trial_starts_at?: string;
  trial_ends_at?: string;
  subscription_starts_at?: string;
  subscription_ends_at?: string;
  billing_email?: string;
  max_users?: number;
  max_workspaces?: number;
  max_storage_gb?: number;
  features_enabled?: string[];
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceRole {
  id: string;
  name: string;
  permissions: Record<string, any>;
  is_deleted: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UserOrganization {
  user_organization_id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  session_id: string;
  user_id: string;
  token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRole {
  id: string;
  role: string;
  display_name: string;
  description?: string;
  permissions: Record<string, any>;
  is_active: boolean;
  is_system_role: boolean;
  hierarchy_level: number;
  created_at: string;
  updated_at: string;
}

export interface UserConfig {
  id: string;
  entity_type: string;
  entity_value: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationConfig {
  id: string;
  entity_type: string;
  entity_value: string;
  display_name: string;
  description?: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface LeadConfig {
  id: string;
  entity_type: string;
  entity_value: string;
  description?: string;
  display_order: number;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserInvitation {
  invitation_id: string;
  email: string;
  organization_id: string;
  role_id: string;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmailOTP {
  id: string;
  email: string;
  otp: string;
  purpose: string;
  expires_at: string;
  verified: boolean;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface EmailVerification {
  id: string;
  user_id: string;
  verification_token: string;
  expires_at: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  lead_id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  alt_email?: string;
  phone?: string;
  alt_phone?: string;
  linkedin_profile?: string;
  business_name?: string;
  company_website?: string;
  meta_data?: Record<string, any>;
  source_id: string;
  industry_id?: string;
  company_size_id?: string;
  product_interest?: string;
  tags?: string[];
  status_id: string;
  assigned_to?: string;
  created_by: string;
  lead_score: number;
  score_grade_id?: string;
  qualification_notes?: string;
  last_contact_date?: string;
  next_followup_date?: string;
  job_title?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadScore {
  score_id: string;
  lead_id: string;
  total_score: number;
  tier: "cold" | "warm" | "hot" | "burning";
  last_calculated: string;
  score_breakdown?: Record<string, any>;
  user_id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ScoringRule {
  rule_id: string;
  organization_id: string;
  rule_name: string;
  rule_type: string;
  condition: Record<string, any>;
  points: number;
  description?: string;
  priority: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  deal_id: string;
  lead_id: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  source?: string;
  priority: string;
  expected_close_date?: string;
  actual_close_date?: string;
  lost_reason?: string;
  user_id: string;
  organization_id: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  activity_id: string;
  activity_type: string;
  related_type: string;
  related_id: string;
  subject: string;
  description?: string;
  outcome?: string;
  direction?: string;
  duration_minutes?: number;
  scheduled_at?: string;
  completed_at?: string;
  due_date?: string;
  priority: string;
  user_id: string;
  next_followup_date?: string;
  file_url?: string;
  file_name?: string;
  file_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Task {
  task_id: string;
  organization_id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  due_date?: string;
  completed_at?: string;
  assigned_to: string;
  created_by: string;
  lead_id?: string;
  deal_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  channel: string;
  action_url?: string;
  action_label?: string;
  related_type?: string;
  related_id?: string;
  organization_id: string;
  read: boolean;
  read_at?: string;
  expires_at?: string;
  sent_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  rule_id: string;
  organization_id: string;
  trigger: string;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  is_active: boolean;
  priority: number;
  last_triggered?: string;
  trigger_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  stage_id: string;
  organization_id: string;
  name: string;
  position: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationWorkspace {
  workspace_id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Helper types for joins/relationships
export interface LeadWithRelations extends Lead {
  status?: LeadConfig;
  source_config?: LeadConfig;
  industry?: LeadConfig;
  company_size?: LeadConfig;
  score_grade?: LeadConfig;
  assigned_user?: Pick<User, "user_id" | "first_name" | "last_name" | "email">;
  created_user?: Pick<User, "user_id" | "first_name" | "last_name">;
  score_data?: LeadScore;
}

export interface DealWithRelations extends Deal {
  lead?: Pick<
    Lead,
    "lead_id" | "first_name" | "last_name" | "business_name" | "email" | "phone"
  >;
  user?: Pick<User, "user_id" | "first_name" | "last_name" | "email">;
}

export interface TaskWithRelations extends Task {
  assigned_user?: Pick<User, "user_id" | "first_name" | "last_name" | "email">;
  created_user?: Pick<User, "user_id" | "first_name" | "last_name" | "email">;
  lead?: Pick<
    Lead,
    "lead_id" | "first_name" | "last_name" | "business_name" | "meta_data"
  >;
  deal?: Pick<Deal, "deal_id" | "title" | "metadata">;
}

export interface ActivityWithRelations extends Activity {
  lead?: Pick<Lead, "lead_id" | "first_name" | "last_name" | "business_name">;
  user?: Pick<User, "user_id" | "first_name" | "last_name" | "email">;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  title: string;
  description?: string;
  location?: string;
  revenue?: string;
  industry?: string;
  close_date?: string;
  workspace_id: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  workspace_id?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  company_id?: string;
  user_id?: string;
  location?: string;
  description?: string;
  contact_time_zone?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceWithRelations extends Workspace {
  organization?: Pick<Organization, "organization_id" | "name" | "slug">;
}

export interface CompanyWithRelations extends Company {
  contacts?: Pick<Contact, "id" | "first_name" | "last_name" | "email">[];
}

export interface ContactWithRelations extends Contact {
  workspace?: Pick<Workspace, "id" | "name" | "description">;
  company?: Pick<Company, "id" | "title" | "location">;
}

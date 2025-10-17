
export interface User {
  id: string;
  email: string;
  name: string;
  role: "Admin" | "BDM" | "SDR" | "Manager";
  avatar?: string;
  phone?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  organizationId?: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  industryType?: string;
  companySize?: number;
  primaryUseCase?: string;
  currentTool?: string;
  subscriptionStatus: "trial" | "active" | "expired" | "cancelled";
  planType: "free" | "basic" | "pro" | "enterprise";
  trialStartsAt?: string;
  trialEndsAt?: string;
  maxUsers: number;
  maxWorkspaces: number;
  featuresEnabled?: string[];
  trialDaysRemaining?: number;
  role?: string;
  roleDisplayName?: string;
  permissions?: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  status: "active" | "inactive" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
  color: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface Deal {
  id: string;
  lead_id?: string;
  stage_id?: string;
  value: number;
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  notes?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
 
  lead?: Lead;
  stage?: PipelineStage;
  assigned_user?: User;
  activities?: Activity[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: "Task" | "Call" | "Meeting" | "Email" | "Note" | "Follow-up";
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Scheduled" | "Completed" | "Cancelled";
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  lead_id?: string;
  deal_id?: string;
  assigned_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
 
  lead?: Lead;
  deal?: Deal;
  assigned_user?: User;
  created_user?: User;
}

export interface Activity {
  id: string;
  lead_id?: string;
  deal_id?: string;
  user_id?: string;
  activity_type:
    | "lead_created"
    | "lead_updated"
    | "deal_created"
    | "deal_moved"
    | "task_created"
    | "task_completed"
    | "call_logged"
    | "email_sent"
    | "meeting_scheduled"
    | "note_added";
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
 
  lead?: Lead;
  deal?: Deal;
  user?: User;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  success: boolean;
}

export interface CreateLeadRequest {
  company_name: string;
  contact_person: string;
  email?: string;
  phone?: string;
  alt_email?: string;
  alt_phone?: string;
  website?: string;
  linkedin_company?: string;
  linkedin_profile?: string;
  status?: string;
  type?: string;
  source: string;
  deal_value?: number;
  industry?: string;
  priority?: string;
  notes?: string;
  assigned_to?: string;
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {
  id: string;
}

export interface CreateDealRequest {
  lead_id?: string;
  stage_id?: string;
  value: number;
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  assigned_to?: string;
}

export interface UpdateDealRequest extends Partial<CreateDealRequest> {
  id: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  lead_id?: string;
  deal_id?: string;
  assigned_to?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
  completed?: boolean;
}

export interface LeadFilters {
  status?: string;
  type?: string;
  source?: string;
  priority?: string;
  assigned_to?: string;
  created_by?: string;
  industry?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  type?: string;
  assigned_to?: string;
  lead_id?: string;
  deal_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  completed?: boolean;
  search?: string;
}

export interface DealFilters {
  stage_id?: string;
  assigned_to?: string;
  probability_min?: number;
  probability_max?: number;
  value_min?: number;
  value_max?: number;
  expected_close_from?: string;
  expected_close_to?: string;
  search?: string;
}

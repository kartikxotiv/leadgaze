export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_assignees: {
        Row: {
          account_id: string
          assigned_at: string
          assigned_by: string
          assigned_to_user_id: string
          assignment_reason: string | null
          assignment_status: string
          created_at: string
          created_by: string
          id: string
          is_primary_assignee: boolean
          notes: string | null
          unassigned_at: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          assigned_at?: string
          assigned_by: string
          assigned_to_user_id: string
          assignment_reason?: string | null
          assignment_status?: string
          created_at?: string
          created_by: string
          id?: string
          is_primary_assignee?: boolean
          notes?: string | null
          unassigned_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          assigned_at?: string
          assigned_by?: string
          assigned_to_user_id?: string
          assignment_reason?: string | null
          assignment_status?: string
          created_at?: string
          created_by?: string
          id?: string
          is_primary_assignee?: boolean
          notes?: string | null
          unassigned_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_assignees_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          joined_via_invite: boolean
          name: string
          picture_url: string | null
          public_data: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          joined_via_invite?: boolean
          name: string
          picture_url?: string | null
          public_data?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          joined_via_invite?: boolean
          name?: string
          picture_url?: string | null
          public_data?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_name: string | null
          id: string
          metadata: Json | null
          module: string
          new_data: Json | null
          old_data: Json | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_name?: string | null
          id?: string
          metadata?: Json | null
          module: string
          new_data?: Json | null
          old_data?: Json | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_name?: string | null
          id?: string
          metadata?: Json | null
          module?: string
          new_data?: Json | null
          old_data?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_to_user_id: string
          assignment_reason: string | null
          assignment_status: string
          contact_id: string
          created_at: string
          created_by: string
          id: string
          is_primary_assignee: boolean
          notes: string | null
          unassigned_at: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assigned_to_user_id: string
          assignment_reason?: string | null
          assignment_status?: string
          contact_id: string
          created_at?: string
          created_by: string
          id?: string
          is_primary_assignee?: boolean
          notes?: string | null
          unassigned_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assigned_to_user_id?: string
          assignment_reason?: string | null
          assignment_status?: string
          contact_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_primary_assignee?: boolean
          notes?: string | null
          unassigned_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_accounts: {
        Row: {
          account_name: string
          account_type: string | null
          annual_revenue: number | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          billing_state: string | null
          billing_street: string | null
          company_size: string | null
          created_at: string
          created_by: string | null
          created_from_lead_id: string | null
          custom_fields: Json | null
          customer_since: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          employee_count: number | null
          id: string
          industry_id: string | null
          is_deleted: boolean
          last_activity_date: string | null
          linkedin_url: string | null
          owner_id: string | null
          parent_account_id: string | null
          phone_number: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          shipping_street: string | null
          status_id: string
          tags: Json | null
          total_revenue: number | null
          twitter_handle: string | null
          updated_at: string
          updated_by: string | null
          website: string | null
          workspace_id: string
        }
        Insert: {
          account_name: string
          account_type?: string | null
          annual_revenue?: number | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          billing_street?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string | null
          created_from_lead_id?: string | null
          custom_fields?: Json | null
          customer_since?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          employee_count?: number | null
          id?: string
          industry_id?: string | null
          is_deleted?: boolean
          last_activity_date?: string | null
          linkedin_url?: string | null
          owner_id?: string | null
          parent_account_id?: string | null
          phone_number?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          status_id: string
          tags?: Json | null
          total_revenue?: number | null
          twitter_handle?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          workspace_id: string
        }
        Update: {
          account_name?: string
          account_type?: string | null
          annual_revenue?: number | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          billing_street?: string | null
          company_size?: string | null
          created_at?: string
          created_by?: string | null
          created_from_lead_id?: string | null
          custom_fields?: Json | null
          customer_since?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          employee_count?: number | null
          id?: string
          industry_id?: string | null
          is_deleted?: boolean
          last_activity_date?: string | null
          linkedin_url?: string | null
          owner_id?: string | null
          parent_account_id?: string | null
          phone_number?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          status_id?: string
          tags?: Json | null
          total_revenue?: number | null
          twitter_handle?: string | null
          updated_at?: string
          updated_by?: string | null
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_created_from_lead_id_fkey"
            columns: ["created_from_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "crm_industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "entity_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_call_logs: {
        Row: {
          call_type: string
          comments: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          date_time: string
          deleted_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_deleted: boolean
          status: string
          subject: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          call_type?: string
          comments?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          date_time: string
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_deleted?: boolean
          status?: string
          subject: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          call_type?: string
          comments?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          date_time?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_deleted?: boolean
          status?: string
          subject?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_call_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_call_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          account_id: string | null
          alt_email: string | null
          alt_phone: string | null
          created_at: string
          created_by: string | null
          created_from_lead_id: string | null
          custom_fields: Json | null
          deleted_at: string | null
          deleted_by: string | null
          department: string | null
          do_not_call: boolean
          do_not_email: boolean
          email: string | null
          email_bounced: boolean
          first_name: string
          id: string
          is_deleted: boolean
          is_primary: boolean
          job_title: string | null
          language: string | null
          last_contact_date: string | null
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          mobile_number: string | null
          notes: string | null
          owner_id: string | null
          phone_number: string | null
          preferred_contact_method: string | null
          reporting_to_id: string | null
          status_id: string
          tags: Json | null
          timezone: string | null
          twitter_handle: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          account_id?: string | null
          alt_email?: string | null
          alt_phone?: string | null
          created_at?: string
          created_by?: string | null
          created_from_lead_id?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          do_not_call?: boolean
          do_not_email?: boolean
          email?: string | null
          email_bounced?: boolean
          first_name: string
          id?: string
          is_deleted?: boolean
          is_primary?: boolean
          job_title?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          mobile_number?: string | null
          notes?: string | null
          owner_id?: string | null
          phone_number?: string | null
          preferred_contact_method?: string | null
          reporting_to_id?: string | null
          status_id: string
          tags?: Json | null
          timezone?: string | null
          twitter_handle?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string | null
          alt_email?: string | null
          alt_phone?: string | null
          created_at?: string
          created_by?: string | null
          created_from_lead_id?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          do_not_call?: boolean
          do_not_email?: boolean
          email?: string | null
          email_bounced?: boolean
          first_name?: string
          id?: string
          is_deleted?: boolean
          is_primary?: boolean
          job_title?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          mobile_number?: string | null
          notes?: string | null
          owner_id?: string | null
          phone_number?: string | null
          preferred_contact_method?: string | null
          reporting_to_id?: string | null
          status_id?: string
          tags?: Json | null
          timezone?: string | null
          twitter_handle?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_created_from_lead_id_fkey"
            columns: ["created_from_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_reporting_to_id_fkey"
            columns: ["reporting_to_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "entity_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_documents: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          entity_id: string
          entity_type: string
          file_path: string
          file_type: string | null
          id: string
          is_deleted: boolean
          name: string
          size_bytes: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          file_path: string
          file_type?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          size_bytes?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          file_path?: string
          file_type?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          size_bytes?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_industries: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          industry_name: string
          is_active: boolean
          is_system: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry_name: string
          is_active?: boolean
          is_system?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry_name?: string
          is_active?: boolean
          is_system?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_industries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_industries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          alt_email: string | null
          annual_revenue: number | null
          company_linkedin_url: string | null
          company_name: string | null
          company_size: Database["public"]["Enums"]["company_size"] | null
          company_website: string | null
          contacted_count: number
          created_at: string
          created_by: string
          custom_fields: Json | null
          deleted_at: string | null
          deleted_by: string | null
          department: string | null
          email: string | null
          first_name: string
          id: string
          industry_id: string | null
          is_deleted: boolean
          job_title: string | null
          last_contact_date: string | null
          last_name: string | null
          lead_score: number | null
          linkedin_url: string | null
          location: string | null
          mobile_number: string | null
          next_followup_date: string | null
          notes: string | null
          owner_id: string | null
          phone_number: string | null
          source_id: string | null
          status_id: string
          tags: Json | null
          timezone: string | null
          trigger: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          alt_email?: string | null
          annual_revenue?: number | null
          company_linkedin_url?: string | null
          company_name?: string | null
          company_size?: Database["public"]["Enums"]["company_size"] | null
          company_website?: string | null
          contacted_count?: number
          created_at?: string
          created_by: string
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          industry_id?: string | null
          is_deleted?: boolean
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          lead_score?: number | null
          linkedin_url?: string | null
          location?: string | null
          mobile_number?: string | null
          next_followup_date?: string | null
          notes?: string | null
          owner_id?: string | null
          phone_number?: string | null
          source_id?: string | null
          status_id: string
          tags?: Json | null
          timezone?: string | null
          trigger?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          alt_email?: string | null
          annual_revenue?: number | null
          company_linkedin_url?: string | null
          company_name?: string | null
          company_size?: Database["public"]["Enums"]["company_size"] | null
          company_website?: string | null
          contacted_count?: number
          created_at?: string
          created_by?: string
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          industry_id?: string | null
          is_deleted?: boolean
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string | null
          lead_score?: number | null
          linkedin_url?: string | null
          location?: string | null
          mobile_number?: string | null
          next_followup_date?: string | null
          notes?: string | null
          owner_id?: string | null
          phone_number?: string | null
          source_id?: string | null
          status_id?: string
          tags?: Json | null
          timezone?: string | null
          trigger?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "crm_industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "entity_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_meetings: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_time: string
          entity_id: string
          entity_type: string
          id: string
          is_deleted: boolean
          location: string | null
          meeting_link: string | null
          start_time: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_time: string
          entity_id: string
          entity_type: string
          id?: string
          is_deleted?: boolean
          location?: string | null
          meeting_link?: string | null
          start_time: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_time?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_deleted?: boolean
          location?: string | null
          meeting_link?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_module_features: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          feature_key: string
          feature_name: string
          feature_type: Database["public"]["Enums"]["crm_feature_type"]
          id: string
          is_active: boolean
          is_system: boolean
          module_id: string
          requires_owner: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          feature_key: string
          feature_name: string
          feature_type?: Database["public"]["Enums"]["crm_feature_type"]
          id?: string
          is_active?: boolean
          is_system?: boolean
          module_id: string
          requires_owner?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          feature_key?: string
          feature_name?: string
          feature_type?: Database["public"]["Enums"]["crm_feature_type"]
          id?: string
          is_active?: boolean
          is_system?: boolean
          module_id?: string
          requires_owner?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_module_features_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_modules: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          module_key: string
          module_name: string
          parent_module_id: string | null
          product_key: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          module_key: string
          module_name: string
          parent_module_id?: string | null
          product_key?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          module_key?: string
          module_name?: string
          parent_module_id?: string | null
          product_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_modules_parent_module_id_fkey"
            columns: ["parent_module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          entity_id: string
          entity_type: string
          id: string
          is_deleted: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          account_id: string
          actual_close_date: string | null
          amount: number | null
          campaign_id: string | null
          close_reason: string | null
          competitor: string | null
          created_at: string
          created_by: string | null
          created_from_lead_id: string | null
          currency: string | null
          custom_fields: Json | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          expected_close_date: string | null
          expected_revenue: number | null
          id: string
          is_closed: boolean
          is_deleted: boolean
          is_won: boolean
          lead_source: string | null
          opportunity_name: string
          opportunity_type: string | null
          owner_id: string
          primary_contact_id: string | null
          priority: string | null
          probability: number | null
          stage_history: Json | null
          stage_id: string
          tags: Json | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          actual_close_date?: string | null
          amount?: number | null
          campaign_id?: string | null
          close_reason?: string | null
          competitor?: string | null
          created_at?: string
          created_by?: string | null
          created_from_lead_id?: string | null
          currency?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_revenue?: number | null
          id?: string
          is_closed?: boolean
          is_deleted?: boolean
          is_won?: boolean
          lead_source?: string | null
          opportunity_name: string
          opportunity_type?: string | null
          owner_id: string
          primary_contact_id?: string | null
          priority?: string | null
          probability?: number | null
          stage_history?: Json | null
          stage_id: string
          tags?: Json | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          actual_close_date?: string | null
          amount?: number | null
          campaign_id?: string | null
          close_reason?: string | null
          competitor?: string | null
          created_at?: string
          created_by?: string | null
          created_from_lead_id?: string | null
          currency?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          expected_close_date?: string | null
          expected_revenue?: number | null
          id?: string
          is_closed?: boolean
          is_deleted?: boolean
          is_won?: boolean
          lead_source?: string | null
          opportunity_name?: string
          opportunity_type?: string | null
          owner_id?: string
          primary_contact_id?: string | null
          priority?: string | null
          probability?: number | null
          stage_history?: Json | null
          stage_id?: string
          tags?: Json | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_opportunities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_created_from_lead_id_fkey"
            columns: ["created_from_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "entity_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_reminders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          entity_id: string
          entity_type: string
          id: string
          is_completed: boolean
          is_deleted: boolean
          priority: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          entity_id: string
          entity_type: string
          id?: string
          is_completed?: boolean
          is_deleted?: boolean
          priority?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          is_completed?: boolean
          is_deleted?: boolean
          priority?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_reminders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_reminders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_reminders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_account_access_grants: {
        Row: {
          can_send: boolean
          created_at: string
          created_by: string | null
          email_account_id: number
          grantee_user_id: string
          id: string
          workspace_id: string
        }
        Insert: {
          can_send?: boolean
          created_at?: string
          created_by?: string | null
          email_account_id: number
          grantee_user_id: string
          id?: string
          workspace_id: string
        }
        Update: {
          can_send?: boolean
          created_at?: string
          created_by?: string | null
          email_account_id?: number
          grantee_user_id?: string
          id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_account_access_grants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_account_access_grants_email_account_workspace_fkey"
            columns: ["email_account_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "email_account_access_grants_grantee_user_id_fkey"
            columns: ["grantee_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_scope: Database["public"]["Enums"]["email_account_access_scope"]
          access_token: string | null
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string | null
          from_name: string | null
          history_id: string | null
          host: string | null
          id: number
          imap_host: string | null
          imap_port: number | null
          imap_secure: boolean | null
          is_active: boolean | null
          is_sync_enabled: boolean | null
          last_synced_at: string | null
          owner_user_id: string
          password: string | null
          port: number | null
          provider: Database["public"]["Enums"]["email_provider"]
          refresh_token: string | null
          secure: boolean | null
          updated_at: string | null
          updated_by: string | null
          username: string | null
          workspace_id: string
        }
        Insert: {
          access_scope?: Database["public"]["Enums"]["email_account_access_scope"]
          access_token?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at?: string | null
          from_name?: string | null
          history_id?: string | null
          host?: string | null
          id?: number
          imap_host?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          is_active?: boolean | null
          is_sync_enabled?: boolean | null
          last_synced_at?: string | null
          owner_user_id: string
          password?: string | null
          port?: number | null
          provider?: Database["public"]["Enums"]["email_provider"]
          refresh_token?: string | null
          secure?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          username?: string | null
          workspace_id: string
        }
        Update: {
          access_scope?: Database["public"]["Enums"]["email_account_access_scope"]
          access_token?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string | null
          from_name?: string | null
          history_id?: string | null
          host?: string | null
          id?: number
          imap_host?: string | null
          imap_port?: number | null
          imap_secure?: boolean | null
          is_active?: boolean | null
          is_sync_enabled?: boolean | null
          last_synced_at?: string | null
          owner_user_id?: string
          password?: string | null
          port?: number | null
          provider?: Database["public"]["Enums"]["email_provider"]
          refresh_token?: string | null
          secure?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          username?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          created_at: string | null
          error: string | null
          from_email: string
          id: number
          provider_message_id: string | null
          rendered_html: string | null
          rendered_text: string | null
          status: string | null
          subject: string | null
          template_id: number | null
          thread_id: string | null
          to_email: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          from_email: string
          id?: number
          provider_message_id?: string | null
          rendered_html?: string | null
          rendered_text?: string | null
          status?: string | null
          subject?: string | null
          template_id?: number | null
          thread_id?: string | null
          to_email: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          from_email?: string
          id?: number
          provider_message_id?: string | null
          rendered_html?: string | null
          rendered_text?: string | null
          status?: string | null
          subject?: string | null
          template_id?: number | null
          thread_id?: string | null
          to_email?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workspace_email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          bcc_emails: string | null
          cc_emails: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          direction: string | null
          entity_id: string | null
          entity_type: string | null
          from_email: string | null
          gmail_message_id: string | null
          html_body: string | null
          id: string
          received_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          snippet: string | null
          status: string | null
          subject: string | null
          text_body: string | null
          to_emails: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          bcc_emails?: string | null
          cc_emails?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          direction?: string | null
          entity_id?: string | null
          entity_type?: string | null
          from_email?: string | null
          gmail_message_id?: string | null
          html_body?: string | null
          id?: string
          received_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          snippet?: string | null
          status?: string | null
          subject?: string | null
          text_body?: string | null
          to_emails?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          bcc_emails?: string | null
          cc_emails?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          direction?: string | null
          entity_id?: string | null
          entity_type?: string | null
          from_email?: string | null
          gmail_message_id?: string | null
          html_body?: string | null
          id?: string
          received_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          snippet?: string | null
          status?: string | null
          subject?: string | null
          text_body?: string | null
          to_emails?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_statuses: {
        Row: {
          auto_actions: Json | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_closed: boolean
          is_default: boolean
          is_system: boolean
          module_id: string
          sort_order: number
          status_key: string
          status_name: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          auto_actions?: Json | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_closed?: boolean
          is_default?: boolean
          is_system?: boolean
          module_id: string
          sort_order?: number
          status_key: string
          status_name: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          auto_actions?: Json | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_closed?: boolean
          is_default?: boolean
          is_system?: boolean
          module_id?: string
          sort_order?: number
          status_key?: string
          status_name?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_statuses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_statuses_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_statuses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_statuses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_to_user_id: string
          assignment_reason: string | null
          assignment_status: string
          created_at: string
          created_by: string
          id: string
          is_primary_assignee: boolean
          lead_id: string
          notes: string | null
          unassigned_at: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assigned_to_user_id: string
          assignment_reason?: string | null
          assignment_status?: string
          created_at?: string
          created_by: string
          id?: string
          is_primary_assignee?: boolean
          lead_id: string
          notes?: string | null
          unassigned_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assigned_to_user_id?: string
          assignment_reason?: string | null
          assignment_status?: string
          created_at?: string
          created_by?: string
          id?: string
          is_primary_assignee?: boolean
          lead_id?: string
          notes?: string | null
          unassigned_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          sort_order: number
          source_key: string
          source_name: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          sort_order?: number
          source_key: string
          source_name: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          sort_order?: number
          source_key?: string
          source_name?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sources_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notifications_sent: {
        Row: {
          id: string
          interval_minutes: number
          meeting_id: string
          sent_at: string
          sent_to: string
        }
        Insert: {
          id?: string
          interval_minutes: number
          meeting_id: string
          sent_at?: string
          sent_to: string
        }
        Update: {
          id?: string
          interval_minutes?: number
          meeting_id?: string
          sent_at?: string
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notifications_sent_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "crm_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_notifications_sent_sent_to_fkey"
            columns: ["sent_to"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      module_entitlements: {
        Row: {
          created_at: string
          entitlement_type: Database["public"]["Enums"]["entitlement_type"]
          granted_by: string | null
          granted_seats: number | null
          id: string
          is_active: boolean
          product_id: string
          reason: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string
          valid_from: string
          valid_until: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entitlement_type: Database["public"]["Enums"]["entitlement_type"]
          granted_by?: string | null
          granted_seats?: number | null
          id?: string
          is_active?: boolean
          product_id: string
          reason: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          entitlement_type?: Database["public"]["Enums"]["entitlement_type"]
          granted_by?: string | null
          granted_seats?: number | null
          id?: string
          is_active?: boolean
          product_id?: string
          reason?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "subscription_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_entitlements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string
          assigned_to_user_id: string
          assignment_reason: string | null
          assignment_status: string
          created_at: string
          created_by: string
          id: string
          is_primary_assignee: boolean
          notes: string | null
          opportunity_id: string
          unassigned_at: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          assigned_to_user_id: string
          assignment_reason?: string | null
          assignment_status?: string
          created_at?: string
          created_by: string
          id?: string
          is_primary_assignee?: boolean
          notes?: string | null
          opportunity_id: string
          unassigned_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          assigned_to_user_id?: string
          assignment_reason?: string | null
          assignment_status?: string
          created_at?: string
          created_by?: string
          id?: string
          is_primary_assignee?: boolean
          notes?: string | null
          opportunity_id?: string
          unassigned_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_assignees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_assignees_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_assignees_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          processed_at: string | null
          processing_error: string | null
          provider_event_id: string
          seat_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          processed_at?: string | null
          processing_error?: string | null
          provider_event_id: string
          seat_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          processed_at?: string | null
          processing_error?: string | null
          provider_event_id?: string
          seat_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "workspace_module_seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_module_map: {
        Row: {
          access_mode: string
          created_at: string
          crm_module_id: string
          id: string
          product_id: string
        }
        Insert: {
          access_mode?: string
          created_at?: string
          crm_module_id: string
          id?: string
          product_id: string
        }
        Update: {
          access_mode?: string
          created_at?: string
          crm_module_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_module_map_crm_module_id_fkey"
            columns: ["crm_module_id"]
            isOneToOne: false
            referencedRelation: "crm_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_module_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "subscription_products"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_notifications_sent: {
        Row: {
          id: string
          reminder_id: string
          sent_at: string
          sent_to: string
        }
        Insert: {
          id?: string
          reminder_id: string
          sent_at?: string
          sent_to: string
        }
        Update: {
          id?: string
          reminder_id?: string
          sent_at?: string
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_notifications_sent_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "crm_reminders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_notifications_sent_sent_to_fkey"
            columns: ["sent_to"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          access_level: Database["public"]["Enums"]["permission_access_level"]
          can_access: boolean
          can_override_owner: boolean
          can_view_sensitive_data: boolean
          conditions: Json | null
          created_at: string
          created_by: string | null
          id: string
          module_feature_id: string
          role_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["permission_access_level"]
          can_access?: boolean
          can_override_owner?: boolean
          can_view_sensitive_data?: boolean
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          module_feature_id: string
          role_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["permission_access_level"]
          can_access?: boolean
          can_override_owner?: boolean
          can_view_sensitive_data?: boolean
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          module_feature_id?: string
          role_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_module_feature_id_fkey"
            columns: ["module_feature_id"]
            isOneToOne: false
            referencedRelation: "crm_module_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          is_active: boolean
          product_id: string
          revoked_at: string | null
          revoked_by: string | null
          seat_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          seat_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          seat_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "subscription_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "workspace_module_seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_public: boolean
          min_seats: number
          monthly_price_per_seat: number | null
          product_key: string
          stripe_monthly_price_id: string | null
          stripe_product_id: string | null
          stripe_yearly_price_id: string | null
          updated_at: string
          yearly_price_per_seat: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          min_seats?: number
          monthly_price_per_seat?: number | null
          product_key: string
          stripe_monthly_price_id?: string | null
          stripe_product_id?: string | null
          stripe_yearly_price_id?: string | null
          updated_at?: string
          yearly_price_per_seat?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          min_seats?: number
          monthly_price_per_seat?: number | null
          product_key?: string
          stripe_monthly_price_id?: string | null
          stripe_product_id?: string | null
          stripe_yearly_price_id?: string | null
          updated_at?: string
          yearly_price_per_seat?: number | null
        }
        Relationships: []
      }
      workspace_email_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          html_body: string
          id: number
          is_active: boolean | null
          name: string
          slug: string
          subject: string
          text_body: string | null
          updated_at: string | null
          updated_by: string | null
          variables: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          html_body: string
          id?: number
          is_active?: boolean | null
          name: string
          slug: string
          subject: string
          text_body?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          html_body?: string
          id?: number
          is_active?: boolean | null
          name?: string
          slug?: string
          subject?: string
          text_body?: string | null
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_email_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_email_variables: {
        Row: {
          created_at: string | null
          id: number
          key: string
          updated_at: string | null
          value: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          key: string
          updated_at?: string | null
          value: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          key?: string
          updated_at?: string | null
          value?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_email_variables_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          is_primary_contact: boolean
          personal_settings: Json | null
          product_key: string | null
          role_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_primary_contact?: boolean
          personal_settings?: Json | null
          product_key?: string | null
          role_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_primary_contact?: boolean
          personal_settings?: Json | null
          product_key?: string | null
          role_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_primary_contact: boolean
          personal_settings: Json | null
          role_id: string
          status: Database["public"]["Enums"]["workspace_member_status"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_primary_contact?: boolean
          personal_settings?: Json | null
          role_id: string
          status?: Database["public"]["Enums"]["workspace_member_status"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_primary_contact?: boolean
          personal_settings?: Json | null
          role_id?: string
          status?: Database["public"]["Enums"]["workspace_member_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_module_seats: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          created_by: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_provider: Database["public"]["Enums"]["payment_provider"]
          product_id: string
          provider_customer_id: string | null
          provider_metadata: Json
          provider_subscription_id: string | null
          seats_purchased: number
          seats_used: number
          status: Database["public"]["Enums"]["seat_subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          product_id: string
          provider_customer_id?: string | null
          provider_metadata?: Json
          provider_subscription_id?: string | null
          seats_purchased?: number
          seats_used?: number
          status?: Database["public"]["Enums"]["seat_subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_provider?: Database["public"]["Enums"]["payment_provider"]
          product_id?: string
          provider_customer_id?: string | null
          provider_metadata?: Json
          provider_subscription_id?: string | null
          seats_purchased?: number
          seats_used?: number
          status?: Database["public"]["Enums"]["seat_subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_module_seats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_module_seats_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "subscription_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_module_seats_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_module_seats_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_roles: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          hierarchy_level: number
          id: string
          is_active: boolean
          is_system: boolean
          product_key: string
          role_key: string
          role_name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          product_key?: string
          role_key: string
          role_name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_active?: boolean
          is_system?: boolean
          product_key?: string
          role_key?: string
          role_name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_team_members: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          is_manager: boolean
          team_id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_manager?: boolean
          team_id: string
          user_id: string
          workspace_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          is_manager?: boolean
          team_id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_team_members_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "workspace_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_team_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_teams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_teams_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_teams_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      account_assignees_with_details: {
        Row: {
          account_id: string | null
          assigned_at: string | null
          assigned_to_user_id: string | null
          assignee_email: string | null
          assignee_name: string | null
          assignee_picture: string | null
          assignment_reason: string | null
          assignment_status: string | null
          id: string | null
          is_primary_assignee: boolean | null
          notes: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_assignees_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_assignees_with_details: {
        Row: {
          assigned_at: string | null
          assigned_to_user_id: string | null
          assignee_email: string | null
          assignee_name: string | null
          assignee_picture: string | null
          assignment_reason: string | null
          assignment_status: string | null
          contact_id: string | null
          id: string | null
          is_primary_assignee: boolean | null
          notes: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignees_with_details: {
        Row: {
          assigned_at: string | null
          assigned_to_user_id: string | null
          assignee_email: string | null
          assignee_name: string | null
          assignee_picture: string | null
          assignment_reason: string | null
          assignment_status: string | null
          id: string | null
          is_primary_assignee: boolean | null
          lead_id: string | null
          notes: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_primary_assignees: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to_user_id: string | null
          assignee_email: string | null
          assignee_name: string | null
          lead_id: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_assignees_with_details: {
        Row: {
          assigned_at: string | null
          assigned_to_user_id: string | null
          assignee_email: string | null
          assignee_name: string | null
          assignee_picture: string | null
          assignment_reason: string | null
          assignment_status: string | null
          id: string | null
          is_primary_assignee: boolean | null
          notes: string | null
          opportunity_id: string | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_assignees_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_assignees_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "crm_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_assignees_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_user_can_send_from_email_account: {
        Args: { p_email_account_id: number }
        Returns: boolean
      }
      current_user_is_workspace_admin: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      current_user_is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      initialize_workspace_crm_data: {
        Args: { p_workspace_id: string }
        Returns: undefined
      }
      user_has_product_access: {
        Args: {
          p_product_key: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      billing_cycle: "monthly" | "yearly"
      company_size: "startup" | "small" | "medium" | "large" | "enterprise"
      crm_feature_type:
        | "crud"
        | "action"
        | "view"
        | "export"
        | "import"
        | "bulk"
      email_account_access_scope: "private" | "workspace"
      email_provider: "google" | "outlook" | "smtp"
      entitlement_type:
        | "free_internal"
        | "partner"
        | "close_customer"
        | "trial"
        | "promo"
      invitation_status:
        | "pending"
        | "accepted"
        | "expired"
        | "declined"
        | "revoked"
      payment_provider: "stripe" | "razorpay" | "manual"
      permission_access_level: "none" | "own" | "team" | "all"
      seat_subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "cancelled"
        | "expired"
      workspace_member_status: "pending" | "accepted" | "inactive" | "removed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      billing_cycle: ["monthly", "yearly"],
      company_size: ["startup", "small", "medium", "large", "enterprise"],
      crm_feature_type: ["crud", "action", "view", "export", "import", "bulk"],
      email_account_access_scope: ["private", "workspace"],
      email_provider: ["google", "outlook", "smtp"],
      entitlement_type: [
        "free_internal",
        "partner",
        "close_customer",
        "trial",
        "promo",
      ],
      invitation_status: [
        "pending",
        "accepted",
        "expired",
        "declined",
        "revoked",
      ],
      payment_provider: ["stripe", "razorpay", "manual"],
      permission_access_level: ["none", "own", "team", "all"],
      seat_subscription_status: [
        "active",
        "trialing",
        "past_due",
        "cancelled",
        "expired",
      ],
      workspace_member_status: ["pending", "accepted", "inactive", "removed"],
    },
  },
} as const

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
      activities: {
        Row: {
          activity_id: string
          activity_type: string
          completed_at: string | null
          created_at: string
          description: string | null
          direction: string | null
          due_date: string | null
          duration_minutes: number | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          metadata: Json | null
          next_followup_date: string | null
          outcome: string | null
          priority: string
          related_id: string
          related_type: string
          scheduled_at: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string
          activity_type: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          direction?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          metadata?: Json | null
          next_followup_date?: string | null
          outcome?: string | null
          priority?: string
          related_id: string
          related_type: string
          scheduled_at?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          activity_type?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          direction?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          metadata?: Json | null
          next_followup_date?: string | null
          outcome?: string | null
          priority?: string
          related_id?: string
          related_type?: string
          scheduled_at?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          created_by: string
          description: string | null
          is_active: boolean
          last_triggered: string | null
          name: string
          organization_id: string
          priority: number
          rule_id: string
          trigger: string
          trigger_count: number
          updated_at: string
        }
        Insert: {
          actions: Json
          conditions: Json
          created_at?: string
          created_by: string
          description?: string | null
          is_active?: boolean
          last_triggered?: string | null
          name: string
          organization_id: string
          priority?: number
          rule_id?: string
          trigger: string
          trigger_count?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          is_active?: boolean
          last_triggered?: string | null
          name?: string
          organization_id?: string
          priority?: number
          rule_id?: string
          trigger?: string
          trigger_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          close_date: string | null
          created_at: string
          description: string | null
          id: string
          industry: string | null
          location: string | null
          revenue: string | null
          title: string
          updated_at: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          close_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          revenue?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          close_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          revenue?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "companies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          contact_time_zone: string | null
          created_at: string
          description: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          location: string | null
          phone_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          contact_time_zone?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          location?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          contact_time_zone?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          location?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_close_date: string | null
          created_at: string
          currency: string
          deal_id: string
          description: string | null
          expected_close_date: string | null
          lead_id: string
          lost_reason: string | null
          metadata: Json | null
          organization_id: string
          priority: string
          probability: number
          source: string | null
          stage: string
          title: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          actual_close_date?: string | null
          created_at?: string
          currency?: string
          deal_id?: string
          description?: string | null
          expected_close_date?: string | null
          lead_id: string
          lost_reason?: string | null
          metadata?: Json | null
          organization_id: string
          priority?: string
          probability?: number
          source?: string | null
          stage?: string
          title: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          actual_close_date?: string | null
          created_at?: string
          currency?: string
          deal_id?: string
          description?: string | null
          expected_close_date?: string | null
          lead_id?: string
          lost_reason?: string | null
          metadata?: Json | null
          organization_id?: string
          priority?: string
          probability?: number
          source?: string | null
          stage?: string
          title?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "deals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_otps: {
        Row: {
          attempts: number | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          otp: string
          purpose: Database["public"]["Enums"]["enum_email_otps_purpose"]
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          otp: string
          purpose?: Database["public"]["Enums"]["enum_email_otps_purpose"]
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          otp?: string
          purpose?: Database["public"]["Enums"]["enum_email_otps_purpose"]
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          attempts: number | null
          created_at: string
          email: string
          expires_at: string
          id: string
          updated_at: string
          user_id: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          updated_at?: string
          user_id: string
          verification_token: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lead_scores: {
        Row: {
          created_at: string
          last_calculated: string
          lead_id: string
          organization_id: string
          score_breakdown: Json | null
          score_id: string
          tier: string
          total_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_calculated?: string
          lead_id: string
          organization_id: string
          score_breakdown?: Json | null
          score_id?: string
          tier?: string
          total_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_calculated?: string
          lead_id?: string
          organization_id?: string
          score_breakdown?: Json | null
          score_id?: string
          tier?: string
          total_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      leads: {
        Row: {
          alt_email: string | null
          alt_phone: string | null
          assigned_to: string | null
          business_name: string | null
          company_size_id: string | null
          company_website: string | null
          created_at: string
          created_by: string
          email: string | null
          first_name: string
          industry_id: string | null
          job_title: string | null
          last_contact_date: string | null
          last_name: string
          lead_id: string
          lead_score: number
          linkedin_profile: string | null
          meta_data: Json | null
          next_followup_date: string | null
          organization_id: string
          phone: string | null
          product_interest: string | null
          qualification_notes: string | null
          score_grade_id: string | null
          source_id: string
          status_id: string
          tags: Json | null
          updated_at: string
        }
        Insert: {
          alt_email?: string | null
          alt_phone?: string | null
          assigned_to?: string | null
          business_name?: string | null
          company_size_id?: string | null
          company_website?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          first_name: string
          industry_id?: string | null
          job_title?: string | null
          last_contact_date?: string | null
          last_name: string
          lead_id?: string
          lead_score?: number
          linkedin_profile?: string | null
          meta_data?: Json | null
          next_followup_date?: string | null
          organization_id: string
          phone?: string | null
          product_interest?: string | null
          qualification_notes?: string | null
          score_grade_id?: string | null
          source_id: string
          status_id: string
          tags?: Json | null
          updated_at?: string
        }
        Update: {
          alt_email?: string | null
          alt_phone?: string | null
          assigned_to?: string | null
          business_name?: string | null
          company_size_id?: string | null
          company_website?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          first_name?: string
          industry_id?: string | null
          job_title?: string | null
          last_contact_date?: string | null
          last_name?: string
          lead_id?: string
          lead_score?: number
          linkedin_profile?: string | null
          meta_data?: Json | null
          next_followup_date?: string | null
          organization_id?: string
          phone?: string | null
          product_interest?: string | null
          qualification_notes?: string | null
          score_grade_id?: string | null
          source_id?: string
          status_id?: string
          tags?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_company_size_id_fkey"
            columns: ["company_size_id"]
            isOneToOne: false
            referencedRelation: "leads_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "leads_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leads_score_grade_id_fkey"
            columns: ["score_grade_id"]
            isOneToOne: false
            referencedRelation: "leads_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "leads_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "leads_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_config: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          entity_type: string
          entity_value: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          entity_type: string
          entity_value: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          entity_type?: string
          entity_value?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          channel: string
          created_at: string
          expires_at: string | null
          is_read: boolean
          message: string
          metadata: Json | null
          notification_id: string
          organization_id: string
          priority: string
          read_at: string | null
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          channel?: string
          created_at?: string
          expires_at?: string | null
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_id?: string
          organization_id: string
          priority?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          channel?: string
          created_at?: string
          expires_at?: string | null
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_id?: string
          organization_id?: string
          priority?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      org_user_accounts: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_login: string | null
          last_name: string
          organization_id: string
          password_hash: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_login?: string | null
          last_name: string
          organization_id: string
          password_hash: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_login?: string | null
          last_name?: string
          organization_id?: string
          password_hash?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_config: {
        Row: {
          config_data: Json | null
          created_at: string
          description: string | null
          display_name: string
          entity_type: string
          entity_value: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          config_data?: Json | null
          created_at?: string
          description?: string | null
          display_name: string
          entity_type: string
          entity_value: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          config_data?: Json | null
          created_at?: string
          description?: string | null
          display_name?: string
          entity_type?: string
          entity_value?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      organization_roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          hierarchy_level: number
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          permissions: Json
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          hierarchy_level?: number
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          permissions?: Json
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          hierarchy_level?: number
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_workspaces: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string
          settings: Json | null
          slug: string
          status_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          settings?: Json | null
          slug: string
          status_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          settings?: Json | null
          slug?: string
          status_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "organization_workspaces_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "organization_config"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          billing_email: string | null
          city: string | null
          company_size_config_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          current_tool: string | null
          description: string | null
          features_enabled: Json | null
          industry_type: string | null
          logo_url: string | null
          max_storage_gb: number | null
          max_users: number | null
          max_workspaces: number | null
          name: string
          organization_id: string
          phone: string | null
          plan_type_id: string | null
          postal_code: string | null
          primary_use_case: string | null
          settings: Json | null
          slug: string
          state: string | null
          status_id: string | null
          subscription_ends_at: string | null
          subscription_starts_at: string | null
          subscription_status_id: string | null
          trial_ends_at: string | null
          trial_starts_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          billing_email?: string | null
          city?: string | null
          company_size_config_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_tool?: string | null
          description?: string | null
          features_enabled?: Json | null
          industry_type?: string | null
          logo_url?: string | null
          max_storage_gb?: number | null
          max_users?: number | null
          max_workspaces?: number | null
          name: string
          organization_id?: string
          phone?: string | null
          plan_type_id?: string | null
          postal_code?: string | null
          primary_use_case?: string | null
          settings?: Json | null
          slug: string
          state?: string | null
          status_id?: string | null
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          subscription_status_id?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          billing_email?: string | null
          city?: string | null
          company_size_config_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          current_tool?: string | null
          description?: string | null
          features_enabled?: Json | null
          industry_type?: string | null
          logo_url?: string | null
          max_storage_gb?: number | null
          max_users?: number | null
          max_workspaces?: number | null
          name?: string
          organization_id?: string
          phone?: string | null
          plan_type_id?: string | null
          postal_code?: string | null
          primary_use_case?: string | null
          settings?: Json | null
          slug?: string
          state?: string | null
          status_id?: string | null
          subscription_ends_at?: string | null
          subscription_starts_at?: string | null
          subscription_status_id?: string | null
          trial_ends_at?: string | null
          trial_starts_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_company_size_config_id_fkey"
            columns: ["company_size_config_id"]
            isOneToOne: false
            referencedRelation: "organization_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organizations_plan_type_id_fkey"
            columns: ["plan_type_id"]
            isOneToOne: false
            referencedRelation: "organization_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "organization_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_subscription_status_id_fkey"
            columns: ["subscription_status_id"]
            isOneToOne: false
            referencedRelation: "organization_config"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          reset_token: string | null
          reseted_at: string | null
          token: string | null
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          reset_token?: string | null
          reseted_at?: string | null
          token?: string | null
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          reset_token?: string | null
          reseted_at?: string | null
          token?: string | null
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      scoring_rules: {
        Row: {
          condition: Json
          created_at: string
          created_by: string
          description: string | null
          is_active: boolean
          organization_id: string
          points: number
          priority: number
          rule_id: string
          rule_name: string
          rule_type: string
          updated_at: string
        }
        Insert: {
          condition: Json
          created_at?: string
          created_by: string
          description?: string | null
          is_active?: boolean
          organization_id: string
          points: number
          priority?: number
          rule_id?: string
          rule_name: string
          rule_type: string
          updated_at?: string
        }
        Update: {
          condition?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          is_active?: boolean
          organization_id?: string
          points?: number
          priority?: number
          rule_id?: string
          rule_name?: string
          rule_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          description: string | null
          due_date: string | null
          lead_id: string | null
          priority: string
          status: string
          task_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          lead_id?: string | null
          priority?: string
          status?: string
          task_id?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          lead_id?: string | null
          priority?: string
          status?: string
          task_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          message: string | null
          organization_id: string
          role_id: string
          status_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invitation_token: string
          invited_by: string
          message?: string | null
          organization_id: string
          role_id: string
          status_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          message?: string | null
          organization_id?: string
          role_id?: string
          status_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_accepted_by_user_id_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_invitations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "users_config"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role_id: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role_id: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role_id?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_organizations_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "organization_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organizations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          current_organization_id: string | null
          device_info: Json | null
          expires_at: string | null
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string | null
          refresh_token: string | null
          session_token: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_organization_id?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          refresh_token?: string | null
          session_token?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_organization_id?: string | null
          device_info?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          refresh_token?: string | null
          session_token?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean | null
          first_name: string
          last_login: string | null
          last_name: string
          last_visited_organization_id: string | null
          lock_until: string | null
          login_attempts: number | null
          password: string
          password_changed_at: string | null
          password_reset_expires: string | null
          password_reset_token: string | null
          phone_number: string | null
          status_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean | null
          first_name: string
          last_login?: string | null
          last_name: string
          last_visited_organization_id?: string | null
          lock_until?: string | null
          login_attempts?: number | null
          password: string
          password_changed_at?: string | null
          password_reset_expires?: string | null
          password_reset_token?: string | null
          phone_number?: string | null
          status_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean | null
          first_name?: string
          last_login?: string | null
          last_name?: string
          last_visited_organization_id?: string | null
          lock_until?: string | null
          login_attempts?: number | null
          password?: string
          password_changed_at?: string | null
          password_reset_expires?: string | null
          password_reset_token?: string | null
          phone_number?: string | null
          status_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_last_visited_organization_id_fkey"
            columns: ["last_visited_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "users_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "users_config"
            referencedColumns: ["id"]
          },
        ]
      }
      users_config: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          entity_type: string
          entity_value: string
          id: string
          is_active: boolean | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          entity_type: string
          entity_value: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          entity_type?: string
          entity_value?: string
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      workspace_roles: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          hierarchy_level: number
          id: string
          is_deleted: boolean
          name: string
          permissions: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_deleted?: boolean
          name: string
          permissions?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          hierarchy_level?: number
          id?: string
          is_deleted?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "workspace_roles_workspace_id_fkey"
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
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_related_type: "lead" | "deal" | "contact" | "company"
      activity_type:
        | "call"
        | "email"
        | "linkedin"
        | "meeting"
        | "task"
        | "note"
        | "demo"
        | "proposal_sent"
        | "lead_created"
        | "lead_updated"
        | "status_changed"
        | "score_updated"
        | "deal_created"
        | "deal_moved"
        | "task_created"
        | "task_completed"
        | "follow_up_scheduled"
      deal_priority: "low" | "medium" | "high" | "urgent"
      deal_stage:
        | "qualification"
        | "proposal"
        | "negotiation"
        | "decision"
        | "closed_won"
        | "closed_lost"
      enum_activities_outcome: "positive" | "neutral" | "negative" | "follow_up"
      enum_activities_type:
        | "call"
        | "email"
        | "meeting"
        | "note"
        | "task"
        | "deal_update"
      enum_deals_deal_status: "open" | "won" | "lost" | "on_hold"
      enum_deals_status: "open" | "won" | "lost" | "cancelled"
      enum_email_otps_purpose: "signup" | "password_reset" | "login"
      enum_leads_company_size: "1-10" | "11-50" | "51-200" | "201-500" | "500+"
      enum_leads_priority: "High" | "Medium" | "Low"
      enum_leads_source:
        | "Website"
        | "Referral"
        | "Cold Call"
        | "LinkedIn"
        | "Email"
        | "Trade Show"
        | "Advertisement"
      enum_leads_status:
        | "New"
        | "Contacted"
        | "Qualified"
        | "Converted"
        | "Disqualified"
      enum_leads_type: "Hot" | "Warm" | "Cold"
      enum_organizations_company_size:
        | "solo"
        | "small"
        | "medium"
        | "large"
        | "enterprise"
      enum_organizations_plan_type: "trial" | "basic" | "pro" | "enterprise"
      enum_organizations_status: "active" | "inactive" | "suspended"
      enum_organizations_subscription_status:
        | "trial"
        | "active"
        | "cancelled"
        | "past_due"
        | "unpaid"
      enum_tasks_priority: "Low" | "Medium" | "High" | "Urgent"
      enum_tasks_status: "Pending" | "In Progress" | "Completed" | "Cancelled"
      enum_tasks_type: "Call" | "Email" | "Meeting" | "Follow-up" | "Other"
      enum_user_organizations_role: "owner" | "admin" | "manager" | "viewer"
      enum_user_organizations_status: "active" | "inactive" | "pending"
      enum_users_status: "active" | "inactive" | "suspended"
      task_priority: "Low" | "Medium" | "High" | "Urgent"
      task_status: "Pending" | "In Progress" | "Completed" | "Cancelled"
      task_type: "Task" | "Call" | "Email" | "Meeting" | "Note"
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
      activity_related_type: ["lead", "deal", "contact", "company"],
      activity_type: [
        "call",
        "email",
        "linkedin",
        "meeting",
        "task",
        "note",
        "demo",
        "proposal_sent",
        "lead_created",
        "lead_updated",
        "status_changed",
        "score_updated",
        "deal_created",
        "deal_moved",
        "task_created",
        "task_completed",
        "follow_up_scheduled",
      ],
      deal_priority: ["low", "medium", "high", "urgent"],
      deal_stage: [
        "qualification",
        "proposal",
        "negotiation",
        "decision",
        "closed_won",
        "closed_lost",
      ],
      enum_activities_outcome: ["positive", "neutral", "negative", "follow_up"],
      enum_activities_type: [
        "call",
        "email",
        "meeting",
        "note",
        "task",
        "deal_update",
      ],
      enum_deals_deal_status: ["open", "won", "lost", "on_hold"],
      enum_deals_status: ["open", "won", "lost", "cancelled"],
      enum_email_otps_purpose: ["signup", "password_reset", "login"],
      enum_leads_company_size: ["1-10", "11-50", "51-200", "201-500", "500+"],
      enum_leads_priority: ["High", "Medium", "Low"],
      enum_leads_source: [
        "Website",
        "Referral",
        "Cold Call",
        "LinkedIn",
        "Email",
        "Trade Show",
        "Advertisement",
      ],
      enum_leads_status: [
        "New",
        "Contacted",
        "Qualified",
        "Converted",
        "Disqualified",
      ],
      enum_leads_type: ["Hot", "Warm", "Cold"],
      enum_organizations_company_size: [
        "solo",
        "small",
        "medium",
        "large",
        "enterprise",
      ],
      enum_organizations_plan_type: ["trial", "basic", "pro", "enterprise"],
      enum_organizations_status: ["active", "inactive", "suspended"],
      enum_organizations_subscription_status: [
        "trial",
        "active",
        "cancelled",
        "past_due",
        "unpaid",
      ],
      enum_tasks_priority: ["Low", "Medium", "High", "Urgent"],
      enum_tasks_status: ["Pending", "In Progress", "Completed", "Cancelled"],
      enum_tasks_type: ["Call", "Email", "Meeting", "Follow-up", "Other"],
      enum_user_organizations_role: ["owner", "admin", "manager", "viewer"],
      enum_user_organizations_status: ["active", "inactive", "pending"],
      enum_users_status: ["active", "inactive", "suspended"],
      task_priority: ["Low", "Medium", "High", "Urgent"],
      task_status: ["Pending", "In Progress", "Completed", "Cancelled"],
      task_type: ["Task", "Call", "Email", "Meeting", "Note"],
    },
  },
} as const

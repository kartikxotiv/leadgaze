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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
            foreignKeyName: "crm_accounts_workspace_id_fkey"
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
            foreignKeyName: "crm_contacts_workspace_id_fkey"
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
          industry: string | null
          is_deleted: boolean
          is_public: boolean
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
          industry?: string | null
          is_deleted?: boolean
          is_public?: boolean
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
          industry?: string | null
          is_deleted?: boolean
          is_public?: boolean
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
            foreignKeyName: "crm_opportunities_workspace_id_fkey"
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
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      company_size: "startup" | "small" | "medium" | "large" | "enterprise"
      crm_feature_type:
        | "crud"
        | "action"
        | "view"
        | "export"
        | "import"
        | "bulk"
      invitation_status:
        | "pending"
        | "accepted"
        | "expired"
        | "declined"
        | "revoked"
      permission_access_level: "none" | "own" | "team" | "all"
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
      company_size: ["startup", "small", "medium", "large", "enterprise"],
      crm_feature_type: ["crud", "action", "view", "export", "import", "bulk"],
      invitation_status: [
        "pending",
        "accepted",
        "expired",
        "declined",
        "revoked",
      ],
      permission_access_level: ["none", "own", "team", "all"],
      workspace_member_status: ["pending", "accepted", "inactive", "removed"],
    },
  },
} as const

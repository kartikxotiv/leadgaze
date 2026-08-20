export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  core: {
    Tables: {
      activities: {
        Row: {
          activity_type: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          activity_type: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          activity_type?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      connector_api_keys: {
        Row: {
          connector_id: string;
          created_at: string;
          hashed_secret_key: string;
          id: string;
          masked_secret_key: string;
          public_key: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          connector_id: string;
          created_at?: string;
          hashed_secret_key: string;
          id?: string;
          masked_secret_key: string;
          public_key: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          connector_id?: string;
          created_at?: string;
          hashed_secret_key?: string;
          id?: string;
          masked_secret_key?: string;
          public_key?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'connector_api_keys_connector_id_fkey';
            columns: ['connector_id'];
            isOneToOne: false;
            referencedRelation: 'connectors';
            referencedColumns: ['id'];
          },
        ];
      };
      connector_events: {
        Row: {
          connector_id: string;
          created_at: string;
          id: string;
          normalized_payload: Json | null;
          raw_payload: Json;
          source: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          connector_id: string;
          created_at?: string;
          id?: string;
          normalized_payload?: Json | null;
          raw_payload: Json;
          source: string;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          connector_id?: string;
          created_at?: string;
          id?: string;
          normalized_payload?: Json | null;
          raw_payload?: Json;
          source?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'connector_events_connector_id_fkey';
            columns: ['connector_id'];
            isOneToOne: false;
            referencedRelation: 'connectors';
            referencedColumns: ['id'];
          },
        ];
      };
      connector_form_fields: {
        Row: {
          created_at: string;
          default_value: string | null;
          field_name: string;
          field_type: string;
          form_id: string;
          id: string;
          is_required: boolean;
          label: string;
          options: Json | null;
          placeholder: string | null;
          sort_order: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          default_value?: string | null;
          field_name: string;
          field_type: string;
          form_id: string;
          id?: string;
          is_required?: boolean;
          label: string;
          options?: Json | null;
          placeholder?: string | null;
          sort_order?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          default_value?: string | null;
          field_name?: string;
          field_type?: string;
          form_id?: string;
          id?: string;
          is_required?: boolean;
          label?: string;
          options?: Json | null;
          placeholder?: string | null;
          sort_order?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'connector_form_fields_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'connector_forms';
            referencedColumns: ['id'];
          },
        ];
      };
      connector_forms: {
        Row: {
          button_color: string | null;
          connector_id: string;
          created_at: string;
          heading: string | null;
          id: string;
          name: string;
          redirect_url: string | null;
          spam_protection_enabled: boolean;
          subheading: string | null;
          success_message: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          button_color?: string | null;
          connector_id: string;
          created_at?: string;
          heading?: string | null;
          id?: string;
          name: string;
          redirect_url?: string | null;
          spam_protection_enabled?: boolean;
          subheading?: string | null;
          success_message?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          button_color?: string | null;
          connector_id?: string;
          created_at?: string;
          heading?: string | null;
          id?: string;
          name?: string;
          redirect_url?: string | null;
          spam_protection_enabled?: boolean;
          subheading?: string | null;
          success_message?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'connector_forms_connector_id_fkey';
            columns: ['connector_id'];
            isOneToOne: false;
            referencedRelation: 'connectors';
            referencedColumns: ['id'];
          },
        ];
      };
      connector_logs: {
        Row: {
          connector_id: string;
          created_at: string;
          error_message: string | null;
          event_id: string | null;
          id: string;
          processing_result: Json | null;
          status: string;
          workspace_id: string;
        };
        Insert: {
          connector_id: string;
          created_at?: string;
          error_message?: string | null;
          event_id?: string | null;
          id?: string;
          processing_result?: Json | null;
          status: string;
          workspace_id: string;
        };
        Update: {
          connector_id?: string;
          created_at?: string;
          error_message?: string | null;
          event_id?: string | null;
          id?: string;
          processing_result?: Json | null;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'connector_logs_connector_id_fkey';
            columns: ['connector_id'];
            isOneToOne: false;
            referencedRelation: 'connectors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'connector_logs_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'connector_events';
            referencedColumns: ['id'];
          },
        ];
      };
      connectors: {
        Row: {
          assignment_mode: string;
          assignment_rules: Json;
          created_at: string;
          created_by: string | null;
          default_owner_id: string | null;
          destination_config: Json;
          destination_entity: string;
          destination_module: string;
          id: string;
          name: string;
          status: string;
          type: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          assignment_mode?: string;
          assignment_rules?: Json;
          created_at?: string;
          created_by?: string | null;
          default_owner_id?: string | null;
          destination_config?: Json;
          destination_entity: string;
          destination_module: string;
          id?: string;
          name: string;
          status?: string;
          type?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          assignment_mode?: string;
          assignment_rules?: Json;
          created_at?: string;
          created_by?: string | null;
          default_owner_id?: string | null;
          destination_config?: Json;
          destination_entity?: string;
          destination_module?: string;
          id?: string;
          name?: string;
          status?: string;
          type?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      currency_exchange_rates: {
        Row: {
          base_currency: string;
          exchange_rate: number;
          expires_at: string | null;
          fetched_at: string;
          id: string;
          provider: string | null;
          target_currency: string;
        };
        Insert: {
          base_currency: string;
          exchange_rate: number;
          expires_at?: string | null;
          fetched_at?: string;
          id?: string;
          provider?: string | null;
          target_currency: string;
        };
        Update: {
          base_currency?: string;
          exchange_rate?: number;
          expires_at?: string | null;
          fetched_at?: string;
          id?: string;
          provider?: string | null;
          target_currency?: string;
        };
        Relationships: [];
      };
      document_relations: {
        Row: {
          created_at: string;
          document_id: string;
          entity_id: string;
          entity_type: string;
          id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          document_id: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          document_id?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'document_relations_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          category: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          file_path: string | null;
          file_size: number | null;
          file_type: string | null;
          file_url: string | null;
          id: string;
          is_deleted: boolean;
          name: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          file_url?: string | null;
          id?: string;
          is_deleted?: boolean;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          file_url?: string | null;
          id?: string;
          is_deleted?: boolean;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      email_account_access_grants: {
        Row: {
          can_send: boolean;
          can_sync: boolean;
          created_at: string;
          created_by: string | null;
          email_account_id: number;
          grantee_user_id: string;
          id: string;
          workspace_id: string;
        };
        Insert: {
          can_send?: boolean;
          can_sync?: boolean;
          created_at?: string;
          created_by?: string | null;
          email_account_id: number;
          grantee_user_id: string;
          id?: string;
          workspace_id: string;
        };
        Update: {
          can_send?: boolean;
          can_sync?: boolean;
          created_at?: string;
          created_by?: string | null;
          email_account_id?: number;
          grantee_user_id?: string;
          id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'core_email_account_access_grants_account_workspace_fkey';
            columns: ['email_account_id', 'workspace_id'];
            isOneToOne: false;
            referencedRelation: 'email_accounts';
            referencedColumns: ['id', 'workspace_id'];
          },
        ];
      };
      email_accounts: {
        Row: {
          access_scope: Database['core']['Enums']['email_account_access_scope_enum'];
          access_token: string | null;
          created_at: string;
          created_by: string | null;
          email: string;
          expires_at: string | null;
          from_name: string | null;
          history_id: string | null;
          id: number;
          imap_host: string | null;
          imap_password: string | null;
          imap_port: number | null;
          imap_secure: boolean;
          imap_username: string | null;
          inbound_enabled: boolean;
          is_active: boolean;
          is_sync_enabled: boolean;
          last_error: string | null;
          last_synced_at: string | null;
          outbound_enabled: boolean;
          owner_user_id: string | null;
          provider: Database['core']['Enums']['email_provider_enum'];
          provider_account_id: string | null;
          refresh_token: string | null;
          settings: Json;
          smtp_host: string | null;
          smtp_password: string | null;
          smtp_port: number | null;
          smtp_secure: boolean;
          smtp_username: string | null;
          sync_cursor: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          access_scope?: Database['core']['Enums']['email_account_access_scope_enum'];
          access_token?: string | null;
          created_at?: string;
          created_by?: string | null;
          email: string;
          expires_at?: string | null;
          from_name?: string | null;
          history_id?: string | null;
          id?: number;
          imap_host?: string | null;
          imap_password?: string | null;
          imap_port?: number | null;
          imap_secure?: boolean;
          imap_username?: string | null;
          inbound_enabled?: boolean;
          is_active?: boolean;
          is_sync_enabled?: boolean;
          last_error?: string | null;
          last_synced_at?: string | null;
          outbound_enabled?: boolean;
          owner_user_id?: string | null;
          provider?: Database['core']['Enums']['email_provider_enum'];
          provider_account_id?: string | null;
          refresh_token?: string | null;
          settings?: Json;
          smtp_host?: string | null;
          smtp_password?: string | null;
          smtp_port?: number | null;
          smtp_secure?: boolean;
          smtp_username?: string | null;
          sync_cursor?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          access_scope?: Database['core']['Enums']['email_account_access_scope_enum'];
          access_token?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string;
          expires_at?: string | null;
          from_name?: string | null;
          history_id?: string | null;
          id?: number;
          imap_host?: string | null;
          imap_password?: string | null;
          imap_port?: number | null;
          imap_secure?: boolean;
          imap_username?: string | null;
          inbound_enabled?: boolean;
          is_active?: boolean;
          is_sync_enabled?: boolean;
          last_error?: string | null;
          last_synced_at?: string | null;
          outbound_enabled?: boolean;
          owner_user_id?: string | null;
          provider?: Database['core']['Enums']['email_provider_enum'];
          provider_account_id?: string | null;
          refresh_token?: string | null;
          settings?: Json;
          smtp_host?: string | null;
          smtp_password?: string | null;
          smtp_port?: number | null;
          smtp_secure?: boolean;
          smtp_username?: string | null;
          sync_cursor?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      email_relations: {
        Row: {
          created_at: string;
          email_id: string;
          entity_id: string;
          entity_type: string;
          id: string;
          relation_type: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          email_id: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          relation_type?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          email_id?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          relation_type?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_relations_email_id_fkey';
            columns: ['email_id'];
            isOneToOne: false;
            referencedRelation: 'emails';
            referencedColumns: ['id'];
          },
        ];
      };
      email_sends: {
        Row: {
          attachments: Json;
          created_at: string;
          created_by: string | null;
          email_account_id: number | null;
          email_id: string | null;
          error: string | null;
          from_email: string;
          id: number;
          provider_message_id: string | null;
          rendered_html: string | null;
          rendered_text: string | null;
          status: string;
          subject: string | null;
          template_id: number | null;
          thread_key: string | null;
          to_email: string;
          workspace_id: string;
        };
        Insert: {
          attachments?: Json;
          created_at?: string;
          created_by?: string | null;
          email_account_id?: number | null;
          email_id?: string | null;
          error?: string | null;
          from_email: string;
          id?: number;
          provider_message_id?: string | null;
          rendered_html?: string | null;
          rendered_text?: string | null;
          status?: string;
          subject?: string | null;
          template_id?: number | null;
          thread_key?: string | null;
          to_email: string;
          workspace_id: string;
        };
        Update: {
          attachments?: Json;
          created_at?: string;
          created_by?: string | null;
          email_account_id?: number | null;
          email_id?: string | null;
          error?: string | null;
          from_email?: string;
          id?: number;
          provider_message_id?: string | null;
          rendered_html?: string | null;
          rendered_text?: string | null;
          status?: string;
          subject?: string | null;
          template_id?: number | null;
          thread_key?: string | null;
          to_email?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_sends_email_account_id_fkey';
            columns: ['email_account_id'];
            isOneToOne: false;
            referencedRelation: 'email_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_sends_email_id_fkey';
            columns: ['email_id'];
            isOneToOne: false;
            referencedRelation: 'emails';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_sends_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'email_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      email_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          html_body: string;
          id: number;
          is_active: boolean;
          name: string;
          slug: string;
          subject: string;
          text_body: string | null;
          updated_at: string;
          updated_by: string | null;
          variables: Json;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          html_body: string;
          id?: number;
          is_active?: boolean;
          name: string;
          slug: string;
          subject: string;
          text_body?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          variables?: Json;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          html_body?: string;
          id?: number;
          is_active?: boolean;
          name?: string;
          slug?: string;
          subject?: string;
          text_body?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          variables?: Json;
          workspace_id?: string;
        };
        Relationships: [];
      };
      email_variables: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: number;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: number;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: number;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      emails: {
        Row: {
          attachments: Json;
          bcc: string | null;
          bcc_emails: Json;
          body: string;
          cc: string | null;
          cc_emails: Json;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          direction: string;
          email_account_id: number | null;
          email_references: string | null;
          from_email: string | null;
          from_name: string | null;
          gmail_message_id: string | null;
          html_body: string | null;
          id: string;
          in_reply_to: string | null;
          internet_message_id: string | null;
          is_deleted: boolean;
          provider_message_id: string | null;
          raw_headers: Json;
          received_at: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          snippet: string | null;
          status: string;
          subject: string;
          template_id: number | null;
          text_body: string | null;
          thread_id: string | null;
          thread_key: string | null;
          to_email: string;
          to_emails: Json;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          attachments?: Json;
          bcc?: string | null;
          bcc_emails?: Json;
          body: string;
          cc?: string | null;
          cc_emails?: Json;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          direction?: string;
          email_account_id?: number | null;
          email_references?: string | null;
          from_email?: string | null;
          from_name?: string | null;
          gmail_message_id?: string | null;
          html_body?: string | null;
          id?: string;
          in_reply_to?: string | null;
          internet_message_id?: string | null;
          is_deleted?: boolean;
          provider_message_id?: string | null;
          raw_headers?: Json;
          received_at?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          snippet?: string | null;
          status?: string;
          subject: string;
          template_id?: number | null;
          text_body?: string | null;
          thread_id?: string | null;
          thread_key?: string | null;
          to_email: string;
          to_emails?: Json;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          attachments?: Json;
          bcc?: string | null;
          bcc_emails?: Json;
          body?: string;
          cc?: string | null;
          cc_emails?: Json;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          direction?: string;
          email_account_id?: number | null;
          email_references?: string | null;
          from_email?: string | null;
          from_name?: string | null;
          gmail_message_id?: string | null;
          html_body?: string | null;
          id?: string;
          in_reply_to?: string | null;
          internet_message_id?: string | null;
          is_deleted?: boolean;
          provider_message_id?: string | null;
          raw_headers?: Json;
          received_at?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          snippet?: string | null;
          status?: string;
          subject?: string;
          template_id?: number | null;
          text_body?: string | null;
          thread_id?: string | null;
          thread_key?: string | null;
          to_email?: string;
          to_emails?: Json;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'emails_email_account_id_fkey';
            columns: ['email_account_id'];
            isOneToOne: false;
            referencedRelation: 'email_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emails_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'email_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      entity_field_values: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          field_id: string;
          id: string;
          updated_at: string;
          value: Json | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          field_id: string;
          id?: string;
          updated_at?: string;
          value?: Json | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          field_id?: string;
          id?: string;
          updated_at?: string;
          value?: Json | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entity_field_values_field_id_fkey';
            columns: ['field_id'];
            isOneToOne: false;
            referencedRelation: 'entity_fields';
            referencedColumns: ['id'];
          },
        ];
      };
      entity_fields: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          display_order: number;
          entity_type: string;
          field_key: string;
          field_label: string;
          field_type: string;
          id: string;
          is_active: boolean;
          is_required: boolean;
          is_system: boolean;
          product_key: string;
          settings: Json;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          entity_type: string;
          field_key: string;
          field_label: string;
          field_type: string;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          is_system?: boolean;
          product_key?: string;
          settings?: Json;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          entity_type?: string;
          field_key?: string;
          field_label?: string;
          field_type?: string;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          is_system?: boolean;
          product_key?: string;
          settings?: Json;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      field_access_members: {
        Row: {
          can_edit: boolean;
          can_view: boolean;
          created_at: string;
          field_access_rule_id: string;
          id: string;
          member_id: string;
          member_type: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          can_edit?: boolean;
          can_view?: boolean;
          created_at?: string;
          field_access_rule_id: string;
          id?: string;
          member_id: string;
          member_type: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          can_edit?: boolean;
          can_view?: boolean;
          created_at?: string;
          field_access_rule_id?: string;
          id?: string;
          member_id?: string;
          member_type?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'field_access_members_field_access_rule_id_fkey';
            columns: ['field_access_rule_id'];
            isOneToOne: false;
            referencedRelation: 'field_access_rules';
            referencedColumns: ['id'];
          },
        ];
      };
      field_access_rules: {
        Row: {
          access_type: string;
          created_at: string;
          field_id: string;
          id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          access_type?: string;
          created_at?: string;
          field_id: string;
          id?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          access_type?: string;
          created_at?: string;
          field_id?: string;
          id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'field_access_rules_field_id_fkey';
            columns: ['field_id'];
            isOneToOne: true;
            referencedRelation: 'entity_fields';
            referencedColumns: ['id'];
          },
        ];
      };
      google_ads_field_mappings: {
        Row: {
          created_at: string;
          form_id: string;
          google_field: string;
          id: string;
          leadgaze_field: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          form_id: string;
          google_field: string;
          id?: string;
          leadgaze_field: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          form_id?: string;
          google_field?: string;
          id?: string;
          leadgaze_field?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'google_ads_field_mappings_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'google_ads_forms';
            referencedColumns: ['id'];
          },
        ];
      };
      google_ads_forms: {
        Row: {
          account_id: string | null;
          campaign_id: string | null;
          campaign_name: string | null;
          connection_id: string;
          created_at: string;
          created_by: string | null;
          customer_id: string;
          default_owner_id: string | null;
          default_pipeline_id: string | null;
          default_source_id: string | null;
          default_stage_id: string | null;
          form_id: string;
          form_name: string;
          id: string;
          is_active: boolean;
          tags: string[];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          account_id?: string | null;
          campaign_id?: string | null;
          campaign_name?: string | null;
          connection_id: string;
          created_at?: string;
          created_by?: string | null;
          customer_id: string;
          default_owner_id?: string | null;
          default_pipeline_id?: string | null;
          default_source_id?: string | null;
          default_stage_id?: string | null;
          form_id: string;
          form_name: string;
          id?: string;
          is_active?: boolean;
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          account_id?: string | null;
          campaign_id?: string | null;
          campaign_name?: string | null;
          connection_id?: string;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string;
          default_owner_id?: string | null;
          default_pipeline_id?: string | null;
          default_source_id?: string | null;
          default_stage_id?: string | null;
          form_id?: string;
          form_name?: string;
          id?: string;
          is_active?: boolean;
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'google_ads_forms_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'integration_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'google_ads_forms_connection_id_fkey';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'integration_connections';
            referencedColumns: ['id'];
          },
        ];
      };
      google_ads_sync_logs: {
        Row: {
          created_at: string;
          crm_lead_id: string | null;
          customer_id: string;
          error_message: string | null;
          form_id: string;
          id: string;
          lead_id: string;
          payload: Json;
          status: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          crm_lead_id?: string | null;
          customer_id: string;
          error_message?: string | null;
          form_id: string;
          id?: string;
          lead_id: string;
          payload?: Json;
          status: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          crm_lead_id?: string | null;
          customer_id?: string;
          error_message?: string | null;
          form_id?: string;
          id?: string;
          lead_id?: string;
          payload?: Json;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      integration_accounts: {
        Row: {
          access_scope: string;
          connection_id: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          display_name: string | null;
          email: string | null;
          external_account_id: string;
          id: string;
          is_deleted: boolean;
          metadata: Json;
          owner_user_id: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          access_scope?: string;
          connection_id: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          display_name?: string | null;
          email?: string | null;
          external_account_id: string;
          id?: string;
          is_deleted?: boolean;
          metadata?: Json;
          owner_user_id?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          access_scope?: string;
          connection_id?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          display_name?: string | null;
          email?: string | null;
          external_account_id?: string;
          id?: string;
          is_deleted?: boolean;
          metadata?: Json;
          owner_user_id?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'integration_accounts_connection_id_fkey';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'integration_connections';
            referencedColumns: ['id'];
          },
        ];
      };
      integration_connections: {
        Row: {
          config: Json;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          is_deleted: boolean;
          provider: string;
          status: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          is_deleted?: boolean;
          provider: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          config?: Json;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          is_deleted?: boolean;
          provider?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      integration_tokens: {
        Row: {
          access_token: string;
          account_id: string;
          created_at: string;
          error_count: number | null;
          expires_at: string | null;
          id: string;
          last_error: string | null;
          last_refreshed_at: string | null;
          refresh_token: string | null;
          scopes: string[] | null;
          token_type: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          access_token: string;
          account_id: string;
          created_at?: string;
          error_count?: number | null;
          expires_at?: string | null;
          id?: string;
          last_error?: string | null;
          last_refreshed_at?: string | null;
          refresh_token?: string | null;
          scopes?: string[] | null;
          token_type?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          access_token?: string;
          account_id?: string;
          created_at?: string;
          error_count?: number | null;
          expires_at?: string | null;
          id?: string;
          last_error?: string | null;
          last_refreshed_at?: string | null;
          refresh_token?: string | null;
          scopes?: string[] | null;
          token_type?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'integration_tokens_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'integration_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      meeting_notes: {
        Row: {
          content: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          is_deleted: boolean;
          meeting_id: string;
          note_type: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          is_deleted?: boolean;
          meeting_id: string;
          note_type?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          is_deleted?: boolean;
          meeting_id?: string;
          note_type?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meeting_notes_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
        ];
      };
      meeting_participants: {
        Row: {
          created_at: string;
          display_name: string | null;
          external_email: string | null;
          id: string;
          internal_user_id: string | null;
          is_host: boolean;
          joined_at: string | null;
          left_at: string | null;
          meeting_id: string;
          participant_type: string;
          response_status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          external_email?: string | null;
          id?: string;
          internal_user_id?: string | null;
          is_host?: boolean;
          joined_at?: string | null;
          left_at?: string | null;
          meeting_id: string;
          participant_type?: string;
          response_status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          external_email?: string | null;
          id?: string;
          internal_user_id?: string | null;
          is_host?: boolean;
          joined_at?: string | null;
          left_at?: string | null;
          meeting_id?: string;
          participant_type?: string;
          response_status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meeting_participants_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
        ];
      };
      meeting_relations: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          meeting_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          meeting_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          meeting_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meeting_relations_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
        ];
      };
      meeting_reminders: {
        Row: {
          channel: string;
          created_at: string;
          id: string;
          meeting_id: string;
          offset_minutes: number;
          scheduled_at: string;
          sent_at: string | null;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          channel?: string;
          created_at?: string;
          id?: string;
          meeting_id: string;
          offset_minutes: number;
          scheduled_at: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          channel?: string;
          created_at?: string;
          id?: string;
          meeting_id?: string;
          offset_minutes?: number;
          scheduled_at?: string;
          sent_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meeting_reminders_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'meetings';
            referencedColumns: ['id'];
          },
        ];
      };
      meetings: {
        Row: {
          actual_end: string | null;
          actual_start: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          end_time: string | null;
          host_user_id: string | null;
          id: string;
          is_deleted: boolean;
          location: string | null;
          meeting_host_email_account_id: string | null;
          meeting_type: string;
          meeting_url: string | null;
          provider: string;
          provider_event_id: string | null;
          provider_meeting_id: string | null;
          scheduled_end: string | null;
          scheduled_start: string | null;
          start_time: string | null;
          status: string;
          timezone: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          actual_end?: string | null;
          actual_start?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          end_time?: string | null;
          host_user_id?: string | null;
          id?: string;
          is_deleted?: boolean;
          location?: string | null;
          meeting_host_email_account_id?: string | null;
          meeting_type?: string;
          meeting_url?: string | null;
          provider?: string;
          provider_event_id?: string | null;
          provider_meeting_id?: string | null;
          scheduled_end?: string | null;
          scheduled_start?: string | null;
          start_time?: string | null;
          status?: string;
          timezone?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          actual_end?: string | null;
          actual_start?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          end_time?: string | null;
          host_user_id?: string | null;
          id?: string;
          is_deleted?: boolean;
          location?: string | null;
          meeting_host_email_account_id?: string | null;
          meeting_type?: string;
          meeting_url?: string | null;
          provider?: string;
          provider_event_id?: string | null;
          provider_meeting_id?: string | null;
          scheduled_end?: string | null;
          scheduled_start?: string | null;
          start_time?: string | null;
          status?: string;
          timezone?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meetings_host_email_account_fk';
            columns: ['meeting_host_email_account_id'];
            isOneToOne: false;
            referencedRelation: 'integration_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      meta_ads_field_mappings: {
        Row: {
          created_at: string;
          form_id: string;
          id: string;
          leadgaze_field: string;
          meta_field: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          form_id: string;
          id?: string;
          leadgaze_field: string;
          meta_field: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          form_id?: string;
          id?: string;
          leadgaze_field?: string;
          meta_field?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meta_ads_field_mappings_form_id_fkey';
            columns: ['form_id'];
            isOneToOne: false;
            referencedRelation: 'meta_ads_forms';
            referencedColumns: ['id'];
          },
        ];
      };
      meta_ads_forms: {
        Row: {
          account_id: string | null;
          business_id: string | null;
          business_name: string | null;
          connection_id: string;
          created_at: string;
          created_by: string | null;
          default_owner_id: string | null;
          default_pipeline_id: string | null;
          default_source_id: string | null;
          default_stage_id: string | null;
          form_id: string;
          form_name: string;
          id: string;
          is_active: boolean;
          page_id: string;
          page_name: string | null;
          tags: string[];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          account_id?: string | null;
          business_id?: string | null;
          business_name?: string | null;
          connection_id: string;
          created_at?: string;
          created_by?: string | null;
          default_owner_id?: string | null;
          default_pipeline_id?: string | null;
          default_source_id?: string | null;
          default_stage_id?: string | null;
          form_id: string;
          form_name: string;
          id?: string;
          is_active?: boolean;
          page_id: string;
          page_name?: string | null;
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          account_id?: string | null;
          business_id?: string | null;
          business_name?: string | null;
          connection_id?: string;
          created_at?: string;
          created_by?: string | null;
          default_owner_id?: string | null;
          default_pipeline_id?: string | null;
          default_source_id?: string | null;
          default_stage_id?: string | null;
          form_id?: string;
          form_name?: string;
          id?: string;
          is_active?: boolean;
          page_id?: string;
          page_name?: string | null;
          tags?: string[];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meta_ads_forms_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'integration_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meta_ads_forms_connection_id_fkey';
            columns: ['connection_id'];
            isOneToOne: false;
            referencedRelation: 'integration_connections';
            referencedColumns: ['id'];
          },
        ];
      };
      meta_ads_sync_logs: {
        Row: {
          created_at: string;
          crm_lead_id: string | null;
          error_message: string | null;
          form_id: string;
          id: string;
          leadgen_id: string;
          page_id: string;
          payload: Json;
          status: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          crm_lead_id?: string | null;
          error_message?: string | null;
          form_id: string;
          id?: string;
          leadgen_id: string;
          page_id: string;
          payload?: Json;
          status: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          crm_lead_id?: string | null;
          error_message?: string | null;
          form_id?: string;
          id?: string;
          leadgen_id?: string;
          page_id?: string;
          payload?: Json;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      module_features: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          feature_key: string;
          feature_name: string;
          id: string;
          is_active: boolean;
          module_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          feature_key: string;
          feature_name: string;
          id?: string;
          is_active?: boolean;
          module_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          feature_key?: string;
          feature_name?: string;
          id?: string;
          is_active?: boolean;
          module_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'module_features_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
        ];
      };
      modules: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          display_order: number;
          icon: string | null;
          id: string;
          is_active: boolean;
          is_system: boolean;
          module_key: string;
          module_name: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          module_key: string;
          module_name: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          module_key?: string;
          module_name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      note_relations: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          note_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          note_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          note_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'note_relations_note_id_fkey';
            columns: ['note_id'];
            isOneToOne: false;
            referencedRelation: 'notes';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          id: string;
          is_closed: boolean;
          is_deleted: boolean;
          note: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          is_closed?: boolean;
          is_deleted?: boolean;
          note: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          id?: string;
          is_closed?: boolean;
          is_deleted?: boolean;
          note?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      plan_modules: {
        Row: {
          id: string;
          is_enabled: boolean;
          module_id: string;
          plan_id: string;
        };
        Insert: {
          id?: string;
          is_enabled?: boolean;
          module_id: string;
          plan_id: string;
        };
        Update: {
          id?: string;
          is_enabled?: boolean;
          module_id?: string;
          plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_modules_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_modules_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          monthly_price: number | null;
          plan_key: string;
          plan_name: string;
          updated_at: string;
          yearly_price: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          monthly_price?: number | null;
          plan_key: string;
          plan_name: string;
          updated_at?: string;
          yearly_price?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          monthly_price?: number | null;
          plan_key?: string;
          plan_name?: string;
          updated_at?: string;
          yearly_price?: number | null;
        };
        Relationships: [];
      };
      reminder_relations: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          reminder_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          reminder_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          reminder_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminder_relations_reminder_id_fkey';
            columns: ['reminder_id'];
            isOneToOne: false;
            referencedRelation: 'reminders';
            referencedColumns: ['id'];
          },
        ];
      };
      reminders: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          due_at: string | null;
          id: string;
          is_deleted: boolean;
          priority: string;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          is_deleted?: boolean;
          priority?: string;
          status?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          id?: string;
          is_deleted?: boolean;
          priority?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      task_relations: {
        Row: {
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          task_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          task_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          task_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_relations_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      task_time_logs: {
        Row: {
          created_at: string;
          description: string | null;
          duration_minutes: number;
          id: string;
          logged_at: string;
          task_id: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration_minutes: number;
          id?: string;
          logged_at?: string;
          task_id: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          logged_at?: string;
          task_id?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_time_logs_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          is_completed: boolean;
          is_deleted: boolean;
          priority: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_completed?: boolean;
          is_deleted?: boolean;
          priority?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          is_completed?: boolean;
          is_deleted?: boolean;
          priority?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      trusted_devices: {
        Row: {
          browser: string | null;
          created_at: string | null;
          device_name: string | null;
          device_token: string;
          expires_at: string;
          id: string;
          ip_address: string | null;
          last_used_at: string | null;
          os: string | null;
          user_id: string;
        };
        Insert: {
          browser?: string | null;
          created_at?: string | null;
          device_name?: string | null;
          device_token: string;
          expires_at: string;
          id?: string;
          ip_address?: string | null;
          last_used_at?: string | null;
          os?: string | null;
          user_id: string;
        };
        Update: {
          browser?: string | null;
          created_at?: string | null;
          device_name?: string | null;
          device_token?: string;
          expires_at?: string;
          id?: string;
          ip_address?: string | null;
          last_used_at?: string | null;
          os?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_column_preferences: {
        Row: {
          entity_type: string;
          id: string;
          preferences: Json;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          entity_type: string;
          id?: string;
          preferences?: Json;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          entity_type?: string;
          id?: string;
          preferences?: Json;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      whatsapp_assignments: {
        Row: {
          assigned_by: string | null;
          assigned_to: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          unassigned_at: string | null;
          workspace_id: string;
        };
        Insert: {
          assigned_by?: string | null;
          assigned_to?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          unassigned_at?: string | null;
          workspace_id: string;
        };
        Update: {
          assigned_by?: string | null;
          assigned_to?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          unassigned_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_assignments_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_conversations: {
        Row: {
          account_id: string | null;
          contact_id: string | null;
          created_at: string;
          customer_name: string | null;
          customer_phone: string;
          first_message: string | null;
          id: string;
          last_customer_message_at: string | null;
          last_message_at: string | null;
          lead_id: string | null;
          message_count: number;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          account_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          customer_name?: string | null;
          customer_phone: string;
          first_message?: string | null;
          id?: string;
          last_customer_message_at?: string | null;
          last_message_at?: string | null;
          lead_id?: string | null;
          message_count?: number;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          account_id?: string | null;
          contact_id?: string | null;
          created_at?: string;
          customer_name?: string | null;
          customer_phone?: string;
          first_message?: string | null;
          id?: string;
          last_customer_message_at?: string | null;
          last_message_at?: string | null;
          lead_id?: string | null;
          message_count?: number;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_conversations_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'integration_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_messages: {
        Row: {
          body: string | null;
          conversation_id: string;
          created_at: string;
          direction: string;
          error_message: string | null;
          id: string;
          media_size: number | null;
          media_type: string | null;
          media_url: string | null;
          message_type: string;
          meta_media_id: string | null;
          meta_message_id: string | null;
          sent_by: string | null;
          status: string;
          template_language: string | null;
          template_name: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          body?: string | null;
          conversation_id: string;
          created_at?: string;
          direction: string;
          error_message?: string | null;
          id?: string;
          media_size?: number | null;
          media_type?: string | null;
          media_url?: string | null;
          message_type?: string;
          meta_media_id?: string | null;
          meta_message_id?: string | null;
          sent_by?: string | null;
          status?: string;
          template_language?: string | null;
          template_name?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          body?: string | null;
          conversation_id?: string;
          created_at?: string;
          direction?: string;
          error_message?: string | null;
          id?: string;
          media_size?: number | null;
          media_type?: string | null;
          media_url?: string | null;
          message_type?: string;
          meta_media_id?: string | null;
          meta_message_id?: string | null;
          sent_by?: string | null;
          status?: string;
          template_language?: string | null;
          template_name?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_notes: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_notes_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'whatsapp_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      whatsapp_saved_replies: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      whatsapp_settings: {
        Row: {
          created_at: string;
          id: string;
          lead_creation_mode: string;
          lead_keywords: string[];
          lead_message_threshold: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lead_creation_mode?: string;
          lead_keywords?: string[];
          lead_message_threshold?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lead_creation_mode?: string;
          lead_keywords?: string[];
          lead_message_threshold?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      whatsapp_templates: {
        Row: {
          account_id: string | null;
          category: string;
          created_at: string;
          id: string;
          language: string;
          meta_template_id: string | null;
          status: string;
          template_name: string;
          template_payload: Json;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          account_id?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          language?: string;
          meta_template_id?: string | null;
          status?: string;
          template_name: string;
          template_payload?: Json;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          account_id?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          language?: string;
          meta_template_id?: string | null;
          status?: string;
          template_name?: string;
          template_payload?: Json;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'whatsapp_templates_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'integration_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_currencies: {
        Row: {
          created_at: string;
          currency_code: string;
          currency_symbol: string;
          id: string;
          is_active: boolean;
          is_default: boolean;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          currency_code: string;
          currency_symbol: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          currency_code?: string;
          currency_symbol?: string;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      workspace_modules: {
        Row: {
          enabled_at: string | null;
          id: string;
          is_enabled: boolean;
          module_id: string;
          workspace_id: string;
        };
        Insert: {
          enabled_at?: string | null;
          id?: string;
          is_enabled?: boolean;
          module_id: string;
          workspace_id: string;
        };
        Update: {
          enabled_at?: string | null;
          id?: string;
          is_enabled?: boolean;
          module_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_modules_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'modules';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_preferences: {
        Row: {
          created_at: string;
          date_format: string;
          default_currency: string;
          id: string;
          time_format: string;
          timezone: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          date_format?: string;
          default_currency?: string;
          id?: string;
          time_format?: string;
          timezone?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          date_format?: string;
          default_currency?: string;
          id?: string;
          time_format?: string;
          timezone?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      workspace_subscriptions: {
        Row: {
          created_at: string;
          expires_at: string | null;
          id: string;
          plan_id: string;
          starts_at: string | null;
          status: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          plan_id: string;
          starts_at?: string | null;
          status?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          plan_id?: string;
          starts_at?: string | null;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      zapier_api_keys: {
        Row: {
          api_key: string;
          created_at: string;
          id: string;
          masked_key: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          api_key: string;
          created_at?: string;
          id?: string;
          masked_key: string;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          api_key?: string;
          created_at?: string;
          id?: string;
          masked_key?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      zapier_integrations: {
        Row: {
          created_at: string;
          id: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      zapier_logs: {
        Row: {
          created_at: string;
          id: string;
          message: string | null;
          request_type: string;
          status: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message?: string | null;
          request_type: string;
          status: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string | null;
          request_type?: string;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      email_account_access_scope_enum: 'private' | 'workspace';
      email_direction_enum: 'inbound' | 'outbound' | 'internal' | 'system';
      email_provider_enum: 'google' | 'outlook' | 'smtp' | 'imap';
      email_status_enum:
        | 'draft'
        | 'scheduled'
        | 'queued'
        | 'sent'
        | 'failed'
        | 'received';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  hrms: {
    Tables: {
      asset_clearances: {
        Row: {
          asset_name: string;
          asset_tag: string | null;
          cleared_at: string | null;
          cleared_by: string | null;
          condition_at_return: Database['hrms']['Enums']['asset_return_condition'];
          created_at: string;
          created_by: string | null;
          employee_id: string;
          id: string;
          issued_date: string | null;
          remarks: string | null;
          resignation_id: string | null;
          returned_date: string | null;
          status: Database['hrms']['Enums']['asset_clearance_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          asset_name: string;
          asset_tag?: string | null;
          cleared_at?: string | null;
          cleared_by?: string | null;
          condition_at_return?: Database['hrms']['Enums']['asset_return_condition'];
          created_at?: string;
          created_by?: string | null;
          employee_id: string;
          id?: string;
          issued_date?: string | null;
          remarks?: string | null;
          resignation_id?: string | null;
          returned_date?: string | null;
          status?: Database['hrms']['Enums']['asset_clearance_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          asset_name?: string;
          asset_tag?: string | null;
          cleared_at?: string | null;
          cleared_by?: string | null;
          condition_at_return?: Database['hrms']['Enums']['asset_return_condition'];
          created_at?: string;
          created_by?: string | null;
          employee_id?: string;
          id?: string;
          issued_date?: string | null;
          remarks?: string | null;
          resignation_id?: string | null;
          returned_date?: string | null;
          status?: Database['hrms']['Enums']['asset_clearance_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_clearances_cleared_by_fkey';
            columns: ['cleared_by'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_clearances_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_clearances_resignation_id_fkey';
            columns: ['resignation_id'];
            isOneToOne: false;
            referencedRelation: 'resignation_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_logs: {
        Row: {
          attendance_record_id: string | null;
          created_at: string;
          created_by: string | null;
          employee_id: string;
          id: string;
          punch_time: string;
          punch_type: Database['hrms']['Enums']['attendance_punch_type'];
          source: string | null;
          workspace_id: string;
        };
        Insert: {
          attendance_record_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          employee_id: string;
          id?: string;
          punch_time?: string;
          punch_type: Database['hrms']['Enums']['attendance_punch_type'];
          source?: string | null;
          workspace_id: string;
        };
        Update: {
          attendance_record_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          employee_id?: string;
          id?: string;
          punch_time?: string;
          punch_type?: Database['hrms']['Enums']['attendance_punch_type'];
          source?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_logs_attendance_record_id_fkey';
            columns: ['attendance_record_id'];
            isOneToOne: false;
            referencedRelation: 'attendance_records';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_logs_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_records: {
        Row: {
          check_in: string | null;
          check_out: string | null;
          created_at: string;
          created_by: string | null;
          date: string;
          employee_id: string;
          id: string;
          shift_id: string | null;
          status: Database['hrms']['Enums']['attendance_record_status'];
          updated_at: string;
          updated_by: string | null;
          work_hours: number | null;
          workspace_id: string;
        };
        Insert: {
          check_in?: string | null;
          check_out?: string | null;
          created_at?: string;
          created_by?: string | null;
          date: string;
          employee_id: string;
          id?: string;
          shift_id?: string | null;
          status?: Database['hrms']['Enums']['attendance_record_status'];
          updated_at?: string;
          updated_by?: string | null;
          work_hours?: number | null;
          workspace_id: string;
        };
        Update: {
          check_in?: string | null;
          check_out?: string | null;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          employee_id?: string;
          id?: string;
          shift_id?: string | null;
          status?: Database['hrms']['Enums']['attendance_record_status'];
          updated_at?: string;
          updated_by?: string | null;
          work_hours?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_records_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_records_shift_id_fkey';
            columns: ['shift_id'];
            isOneToOne: false;
            referencedRelation: 'shifts';
            referencedColumns: ['id'];
          },
        ];
      };
      attendance_settings: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          updated_at: string;
          updated_by: string | null;
          working_days: number[];
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
          working_days?: number[];
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          updated_at?: string;
          updated_by?: string | null;
          working_days?: number[];
          workspace_id?: string;
        };
        Relationships: [];
      };
      company_announcements: {
        Row: {
          body: string;
          category: Database['hrms']['Enums']['announcement_category'];
          created_at: string;
          created_by: string | null;
          cta_label: string | null;
          cta_url: string | null;
          expires_at: string | null;
          id: string;
          is_pinned: boolean;
          published_at: string;
          status: Database['hrms']['Enums']['announcement_status'];
          summary: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          body: string;
          category?: Database['hrms']['Enums']['announcement_category'];
          created_at?: string;
          created_by?: string | null;
          cta_label?: string | null;
          cta_url?: string | null;
          expires_at?: string | null;
          id?: string;
          is_pinned?: boolean;
          published_at?: string;
          status?: Database['hrms']['Enums']['announcement_status'];
          summary?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          body?: string;
          category?: Database['hrms']['Enums']['announcement_category'];
          created_at?: string;
          created_by?: string | null;
          cta_label?: string | null;
          cta_url?: string | null;
          expires_at?: string | null;
          id?: string;
          is_pinned?: boolean;
          published_at?: string;
          status?: Database['hrms']['Enums']['announcement_status'];
          summary?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          code: string;
          cost_center_code: string | null;
          created_at: string;
          created_by: string | null;
          head_account_id: string | null;
          id: string;
          is_active: boolean;
          name: string;
          parent_department_id: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          code: string;
          cost_center_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          head_account_id?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          parent_department_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          code?: string;
          cost_center_code?: string | null;
          created_at?: string;
          created_by?: string | null;
          head_account_id?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          parent_department_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'departments_parent_department_id_fkey';
            columns: ['parent_department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_compensation_assignments: {
        Row: {
          annual_ctc: number | null;
          assignment_type: Database['hrms']['Enums']['compensation_assignment_type'];
          created_at: string;
          created_by: string | null;
          currency_code: string;
          effective_from: string;
          effective_to: string | null;
          employee_id: string;
          hourly_rate: number | null;
          id: string;
          is_primary: boolean;
          monthly_gross: number | null;
          notes: string | null;
          pay_frequency: Database['hrms']['Enums']['pay_frequency'];
          salary_structure_id: string | null;
          status: Database['hrms']['Enums']['compensation_assignment_status'];
          target_variable_amount: number | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          annual_ctc?: number | null;
          assignment_type?: Database['hrms']['Enums']['compensation_assignment_type'];
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          effective_from: string;
          effective_to?: string | null;
          employee_id: string;
          hourly_rate?: number | null;
          id?: string;
          is_primary?: boolean;
          monthly_gross?: number | null;
          notes?: string | null;
          pay_frequency?: Database['hrms']['Enums']['pay_frequency'];
          salary_structure_id?: string | null;
          status?: Database['hrms']['Enums']['compensation_assignment_status'];
          target_variable_amount?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          annual_ctc?: number | null;
          assignment_type?: Database['hrms']['Enums']['compensation_assignment_type'];
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          effective_from?: string;
          effective_to?: string | null;
          employee_id?: string;
          hourly_rate?: number | null;
          id?: string;
          is_primary?: boolean;
          monthly_gross?: number | null;
          notes?: string | null;
          pay_frequency?: Database['hrms']['Enums']['pay_frequency'];
          salary_structure_id?: string | null;
          status?: Database['hrms']['Enums']['compensation_assignment_status'];
          target_variable_amount?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_compensation_assignments_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_compensation_assignments_salary_structure_id_fkey';
            columns: ['salary_structure_id'];
            isOneToOne: false;
            referencedRelation: 'salary_structures';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_compensation_components: {
        Row: {
          amount_override: number | null;
          calculation_type: Database['hrms']['Enums']['salary_calculation_type'];
          calculation_value: number;
          compensation_assignment_id: string;
          created_at: string;
          created_by: string | null;
          display_order: number;
          effective_from: string;
          effective_to: string | null;
          id: string;
          is_pro_ratable: boolean;
          is_recurring: boolean;
          is_taxable: boolean;
          salary_component_id: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          amount_override?: number | null;
          calculation_type?: Database['hrms']['Enums']['salary_calculation_type'];
          calculation_value?: number;
          compensation_assignment_id: string;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          effective_from: string;
          effective_to?: string | null;
          id?: string;
          is_pro_ratable?: boolean;
          is_recurring?: boolean;
          is_taxable?: boolean;
          salary_component_id: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          amount_override?: number | null;
          calculation_type?: Database['hrms']['Enums']['salary_calculation_type'];
          calculation_value?: number;
          compensation_assignment_id?: string;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          effective_from?: string;
          effective_to?: string | null;
          id?: string;
          is_pro_ratable?: boolean;
          is_recurring?: boolean;
          is_taxable?: boolean;
          salary_component_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_compensation_component_compensation_assignment_id_fkey';
            columns: ['compensation_assignment_id'];
            isOneToOne: false;
            referencedRelation: 'employee_compensation_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_compensation_components_salary_component_id_fkey';
            columns: ['salary_component_id'];
            isOneToOne: false;
            referencedRelation: 'salary_components';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_documents: {
        Row: {
          created_at: string;
          created_by: string | null;
          employee_id: string | null;
          expiry_at: string | null;
          file_url: string;
          id: string;
          name: string;
          status: Database['hrms']['Enums']['document_status'];
          updated_at: string;
          updated_by: string | null;
          uploaded_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          employee_id?: string | null;
          expiry_at?: string | null;
          file_url: string;
          id?: string;
          name: string;
          status?: Database['hrms']['Enums']['document_status'];
          updated_at?: string;
          updated_by?: string | null;
          uploaded_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          employee_id?: string | null;
          expiry_at?: string | null;
          file_url?: string;
          id?: string;
          name?: string;
          status?: Database['hrms']['Enums']['document_status'];
          updated_at?: string;
          updated_by?: string | null;
          uploaded_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_documents_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_exit_letters: {
        Row: {
          created_at: string;
          created_by: string | null;
          employee_id: string;
          id: string;
          issued_at: string | null;
          issued_by: string | null;
          letter_number: string | null;
          letter_type: Database['hrms']['Enums']['exit_letter_type'];
          letter_url: string | null;
          remarks: string | null;
          resignation_id: string | null;
          status: Database['hrms']['Enums']['exit_letter_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          employee_id: string;
          id?: string;
          issued_at?: string | null;
          issued_by?: string | null;
          letter_number?: string | null;
          letter_type: Database['hrms']['Enums']['exit_letter_type'];
          letter_url?: string | null;
          remarks?: string | null;
          resignation_id?: string | null;
          status?: Database['hrms']['Enums']['exit_letter_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          employee_id?: string;
          id?: string;
          issued_at?: string | null;
          issued_by?: string | null;
          letter_number?: string | null;
          letter_type?: Database['hrms']['Enums']['exit_letter_type'];
          letter_url?: string | null;
          remarks?: string | null;
          resignation_id?: string | null;
          status?: Database['hrms']['Enums']['exit_letter_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_exit_letters_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_exit_letters_issued_by_fkey';
            columns: ['issued_by'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_exit_letters_resignation_id_fkey';
            columns: ['resignation_id'];
            isOneToOne: false;
            referencedRelation: 'resignation_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_pay_items: {
        Row: {
          amount: number;
          compensation_assignment_id: string | null;
          created_at: string;
          created_by: string | null;
          effective_date: string;
          employee_id: string;
          id: string;
          notes: string | null;
          payable_in_period_end: string | null;
          payable_in_period_start: string | null;
          quantity: number | null;
          rate: number | null;
          salary_component_id: string;
          source_type: Database['hrms']['Enums']['pay_item_source_type'];
          status: Database['hrms']['Enums']['pay_item_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          amount: number;
          compensation_assignment_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          effective_date: string;
          employee_id: string;
          id?: string;
          notes?: string | null;
          payable_in_period_end?: string | null;
          payable_in_period_start?: string | null;
          quantity?: number | null;
          rate?: number | null;
          salary_component_id: string;
          source_type?: Database['hrms']['Enums']['pay_item_source_type'];
          status?: Database['hrms']['Enums']['pay_item_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          amount?: number;
          compensation_assignment_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          effective_date?: string;
          employee_id?: string;
          id?: string;
          notes?: string | null;
          payable_in_period_end?: string | null;
          payable_in_period_start?: string | null;
          quantity?: number | null;
          rate?: number | null;
          salary_component_id?: string;
          source_type?: Database['hrms']['Enums']['pay_item_source_type'];
          status?: Database['hrms']['Enums']['pay_item_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_pay_items_compensation_assignment_id_fkey';
            columns: ['compensation_assignment_id'];
            isOneToOne: false;
            referencedRelation: 'employee_compensation_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_pay_items_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_pay_items_salary_component_id_fkey';
            columns: ['salary_component_id'];
            isOneToOne: false;
            referencedRelation: 'salary_components';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_roles: {
        Row: {
          created_at: string;
          created_by: string | null;
          employee_id: string;
          id: string;
          role_id: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          employee_id: string;
          id?: string;
          role_id: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          employee_id?: string;
          id?: string;
          role_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_roles_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      employees: {
        Row: {
          account_id: string | null;
          address: string | null;
          created_at: string;
          created_by: string | null;
          custom_fields: Json;
          deleted_at: string | null;
          deleted_by: string | null;
          department_id: string | null;
          designation: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          employee_code: string;
          employment_type: Database['hrms']['Enums']['employee_employment_type'];
          exit_date: string | null;
          first_name: string;
          id: string;
          invited_at: string | null;
          invited_by: string | null;
          is_deleted: boolean;
          joining_date: string | null;
          last_name: string | null;
          manager_employee_id: string | null;
          personal_email: string | null;
          phone: string | null;
          shift_id: string | null;
          status: Database['hrms']['Enums']['employee_status'];
          updated_at: string;
          updated_by: string | null;
          work_email: string;
          workspace_id: string;
        };
        Insert: {
          account_id?: string | null;
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_fields?: Json;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department_id?: string | null;
          designation?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          employee_code: string;
          employment_type?: Database['hrms']['Enums']['employee_employment_type'];
          exit_date?: string | null;
          first_name: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          is_deleted?: boolean;
          joining_date?: string | null;
          last_name?: string | null;
          manager_employee_id?: string | null;
          personal_email?: string | null;
          phone?: string | null;
          shift_id?: string | null;
          status?: Database['hrms']['Enums']['employee_status'];
          updated_at?: string;
          updated_by?: string | null;
          work_email: string;
          workspace_id: string;
        };
        Update: {
          account_id?: string | null;
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_fields?: Json;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department_id?: string | null;
          designation?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          employee_code?: string;
          employment_type?: Database['hrms']['Enums']['employee_employment_type'];
          exit_date?: string | null;
          first_name?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          is_deleted?: boolean;
          joining_date?: string | null;
          last_name?: string | null;
          manager_employee_id?: string | null;
          personal_email?: string | null;
          phone?: string | null;
          shift_id?: string | null;
          status?: Database['hrms']['Enums']['employee_status'];
          updated_at?: string;
          updated_by?: string | null;
          work_email?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employees_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_manager_employee_id_fkey';
            columns: ['manager_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_shift_id_fkey';
            columns: ['shift_id'];
            isOneToOne: false;
            referencedRelation: 'shifts';
            referencedColumns: ['id'];
          },
        ];
      };
      exit_checklist_items: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      exit_checklists: {
        Row: {
          checklist_item_id: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_date: string | null;
          employee_id: string;
          id: string;
          owner_employee_id: string | null;
          remarks: string | null;
          resignation_id: string | null;
          task_category: Database['hrms']['Enums']['exit_task_category'];
          task_name: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          checklist_item_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          employee_id: string;
          id?: string;
          owner_employee_id?: string | null;
          remarks?: string | null;
          resignation_id?: string | null;
          task_category?: Database['hrms']['Enums']['exit_task_category'];
          task_name: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          checklist_item_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          employee_id?: string;
          id?: string;
          owner_employee_id?: string | null;
          remarks?: string | null;
          resignation_id?: string | null;
          task_category?: Database['hrms']['Enums']['exit_task_category'];
          task_name?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exit_checklists_checklist_item_id_fkey';
            columns: ['checklist_item_id'];
            isOneToOne: false;
            referencedRelation: 'exit_checklist_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exit_checklists_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exit_checklists_owner_employee_id_fkey';
            columns: ['owner_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exit_checklists_resignation_id_fkey';
            columns: ['resignation_id'];
            isOneToOne: false;
            referencedRelation: 'resignation_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      fnf_settlements: {
        Row: {
          components: Json;
          created_at: string;
          created_by: string | null;
          employee_id: string;
          gratuity: number;
          id: string;
          last_working_day: string;
          leave_encashment: number;
          net_payable: number;
          notice_recovery: number;
          payroll_run_id: string | null;
          remarks: string | null;
          settlement_date: string | null;
          status: Database['hrms']['Enums']['fnf_settlement_status'];
          tds_on_fnf: number;
          total_payable: number;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          components?: Json;
          created_at?: string;
          created_by?: string | null;
          employee_id: string;
          gratuity?: number;
          id?: string;
          last_working_day: string;
          leave_encashment?: number;
          net_payable?: number;
          notice_recovery?: number;
          payroll_run_id?: string | null;
          remarks?: string | null;
          settlement_date?: string | null;
          status?: Database['hrms']['Enums']['fnf_settlement_status'];
          tds_on_fnf?: number;
          total_payable?: number;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          components?: Json;
          created_at?: string;
          created_by?: string | null;
          employee_id?: string;
          gratuity?: number;
          id?: string;
          last_working_day?: string;
          leave_encashment?: number;
          net_payable?: number;
          notice_recovery?: number;
          payroll_run_id?: string | null;
          remarks?: string | null;
          settlement_date?: string | null;
          status?: Database['hrms']['Enums']['fnf_settlement_status'];
          tds_on_fnf?: number;
          total_payable?: number;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fnf_settlements_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      hr_requests: {
        Row: {
          category: Database['hrms']['Enums']['hr_request_category'];
          created_at: string;
          created_by: string | null;
          description: string;
          employee_id: string;
          id: string;
          priority: Database['hrms']['Enums']['hr_request_priority'];
          resolved_at: string | null;
          response_message: string | null;
          status: Database['hrms']['Enums']['hr_request_status'];
          subject: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          category: Database['hrms']['Enums']['hr_request_category'];
          created_at?: string;
          created_by?: string | null;
          description: string;
          employee_id: string;
          id?: string;
          priority?: Database['hrms']['Enums']['hr_request_priority'];
          resolved_at?: string | null;
          response_message?: string | null;
          status?: Database['hrms']['Enums']['hr_request_status'];
          subject: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          category?: Database['hrms']['Enums']['hr_request_category'];
          created_at?: string;
          created_by?: string | null;
          description?: string;
          employee_id?: string;
          id?: string;
          priority?: Database['hrms']['Enums']['hr_request_priority'];
          resolved_at?: string | null;
          response_message?: string | null;
          status?: Database['hrms']['Enums']['hr_request_status'];
          subject?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'hr_requests_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      invited_employees: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          created_by: string | null;
          employee_id: string | null;
          id: string;
          invited_at: string;
          invited_email: string | null;
          status: Database['hrms']['Enums']['employee_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          employee_id?: string | null;
          id?: string;
          invited_at?: string;
          invited_email?: string | null;
          status?: Database['hrms']['Enums']['employee_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          employee_id?: string | null;
          id?: string;
          invited_at?: string;
          invited_email?: string | null;
          status?: Database['hrms']['Enums']['employee_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invited_employees_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      leave_holidays: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          holiday_date: string;
          id: string;
          is_optional: boolean;
          name: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          holiday_date: string;
          id?: string;
          is_optional?: boolean;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          holiday_date?: string;
          id?: string;
          is_optional?: boolean;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      leave_requests: {
        Row: {
          approver_employee_id: string | null;
          created_at: string;
          created_by: string | null;
          day_count: number;
          decision_at: string | null;
          decision_note: string | null;
          employee_id: string;
          from_date: string;
          id: string;
          leave_type_id: string;
          reason: string | null;
          status: Database['hrms']['Enums']['leave_request_status'];
          to_date: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          approver_employee_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          day_count?: number;
          decision_at?: string | null;
          decision_note?: string | null;
          employee_id: string;
          from_date: string;
          id?: string;
          leave_type_id: string;
          reason?: string | null;
          status?: Database['hrms']['Enums']['leave_request_status'];
          to_date: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          approver_employee_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          day_count?: number;
          decision_at?: string | null;
          decision_note?: string | null;
          employee_id?: string;
          from_date?: string;
          id?: string;
          leave_type_id?: string;
          reason?: string | null;
          status?: Database['hrms']['Enums']['leave_request_status'];
          to_date?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'leave_requests_approver_employee_id_fkey';
            columns: ['approver_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leave_requests_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leave_requests_leave_type_id_fkey';
            columns: ['leave_type_id'];
            isOneToOne: false;
            referencedRelation: 'leave_types';
            referencedColumns: ['id'];
          },
        ];
      };
      leave_types: {
        Row: {
          annual_allocation: number;
          can_carry_forward: boolean;
          code: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          requires_hr_approval: boolean;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          annual_allocation?: number;
          can_carry_forward?: boolean;
          code: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          requires_hr_approval?: boolean;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          annual_allocation?: number;
          can_carry_forward?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          requires_hr_approval?: boolean;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      payroll_entries: {
        Row: {
          attendance_days: number;
          calculated_at: string | null;
          calculation_snapshot: Json;
          compensation_assignment_id: string | null;
          created_at: string;
          created_by: string | null;
          employee_id: string;
          employer_contributions: number;
          gross_earnings: number;
          id: string;
          lop_days: number;
          net_pay: number;
          paid_days: number;
          payroll_run_id: string;
          status: Database['hrms']['Enums']['payroll_entry_status'];
          total_deductions: number;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          attendance_days?: number;
          calculated_at?: string | null;
          calculation_snapshot?: Json;
          compensation_assignment_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          employee_id: string;
          employer_contributions?: number;
          gross_earnings?: number;
          id?: string;
          lop_days?: number;
          net_pay?: number;
          paid_days?: number;
          payroll_run_id: string;
          status?: Database['hrms']['Enums']['payroll_entry_status'];
          total_deductions?: number;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          attendance_days?: number;
          calculated_at?: string | null;
          calculation_snapshot?: Json;
          compensation_assignment_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          employee_id?: string;
          employer_contributions?: number;
          gross_earnings?: number;
          id?: string;
          lop_days?: number;
          net_pay?: number;
          paid_days?: number;
          payroll_run_id?: string;
          status?: Database['hrms']['Enums']['payroll_entry_status'];
          total_deductions?: number;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payroll_entries_compensation_assignment_id_fkey';
            columns: ['compensation_assignment_id'];
            isOneToOne: false;
            referencedRelation: 'employee_compensation_assignments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payroll_entries_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payroll_entries_payroll_run_id_fkey';
            columns: ['payroll_run_id'];
            isOneToOne: false;
            referencedRelation: 'payroll_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      payroll_entry_items: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          display_order: number;
          employee_pay_item_id: string | null;
          id: string;
          is_employer_side: boolean;
          is_taxable: boolean;
          metadata: Json;
          payroll_entry_id: string;
          quantity: number | null;
          rate: number | null;
          salary_component_id: string;
          source: Database['hrms']['Enums']['payroll_item_source'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          employee_pay_item_id?: string | null;
          id?: string;
          is_employer_side?: boolean;
          is_taxable?: boolean;
          metadata?: Json;
          payroll_entry_id: string;
          quantity?: number | null;
          rate?: number | null;
          salary_component_id: string;
          source?: Database['hrms']['Enums']['payroll_item_source'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          employee_pay_item_id?: string | null;
          id?: string;
          is_employer_side?: boolean;
          is_taxable?: boolean;
          metadata?: Json;
          payroll_entry_id?: string;
          quantity?: number | null;
          rate?: number | null;
          salary_component_id?: string;
          source?: Database['hrms']['Enums']['payroll_item_source'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payroll_entry_items_employee_pay_item_id_fkey';
            columns: ['employee_pay_item_id'];
            isOneToOne: false;
            referencedRelation: 'employee_pay_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payroll_entry_items_payroll_entry_id_fkey';
            columns: ['payroll_entry_id'];
            isOneToOne: false;
            referencedRelation: 'payroll_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payroll_entry_items_salary_component_id_fkey';
            columns: ['salary_component_id'];
            isOneToOne: false;
            referencedRelation: 'salary_components';
            referencedColumns: ['id'];
          },
        ];
      };
      payroll_runs: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          locked_at: string | null;
          name: string | null;
          payment_date: string | null;
          period_end: string;
          period_start: string;
          status: Database['hrms']['Enums']['payroll_run_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          locked_at?: string | null;
          name?: string | null;
          payment_date?: string | null;
          period_end: string;
          period_start: string;
          status?: Database['hrms']['Enums']['payroll_run_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          locked_at?: string | null;
          name?: string | null;
          payment_date?: string | null;
          period_end?: string;
          period_start?: string;
          status?: Database['hrms']['Enums']['payroll_run_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      payslip_components: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          display_order: number;
          id: string;
          is_employer_side: boolean;
          is_taxable: boolean;
          metadata: Json;
          payroll_entry_item_id: string | null;
          payslip_id: string;
          quantity: number | null;
          rate: number | null;
          salary_component_id: string;
          source: Database['hrms']['Enums']['payroll_item_source'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          id?: string;
          is_employer_side?: boolean;
          is_taxable?: boolean;
          metadata?: Json;
          payroll_entry_item_id?: string | null;
          payslip_id: string;
          quantity?: number | null;
          rate?: number | null;
          salary_component_id: string;
          source?: Database['hrms']['Enums']['payroll_item_source'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          id?: string;
          is_employer_side?: boolean;
          is_taxable?: boolean;
          metadata?: Json;
          payroll_entry_item_id?: string | null;
          payslip_id?: string;
          quantity?: number | null;
          rate?: number | null;
          salary_component_id?: string;
          source?: Database['hrms']['Enums']['payroll_item_source'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payslip_components_payroll_entry_item_id_fkey';
            columns: ['payroll_entry_item_id'];
            isOneToOne: false;
            referencedRelation: 'payroll_entry_items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payslip_components_payslip_id_fkey';
            columns: ['payslip_id'];
            isOneToOne: false;
            referencedRelation: 'payslips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payslip_components_salary_component_id_fkey';
            columns: ['salary_component_id'];
            isOneToOne: false;
            referencedRelation: 'salary_components';
            referencedColumns: ['id'];
          },
        ];
      };
      payslips: {
        Row: {
          created_at: string;
          created_by: string | null;
          deductions: number;
          employee_id: string;
          employer_contributions: number;
          generated_at: string;
          gross_salary: number;
          id: string;
          net_salary: number;
          payroll_entry_id: string;
          payroll_run_id: string;
          published_at: string | null;
          status: Database['hrms']['Enums']['payslip_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deductions?: number;
          employee_id: string;
          employer_contributions?: number;
          generated_at?: string;
          gross_salary?: number;
          id?: string;
          net_salary?: number;
          payroll_entry_id: string;
          payroll_run_id: string;
          published_at?: string | null;
          status?: Database['hrms']['Enums']['payslip_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deductions?: number;
          employee_id?: string;
          employer_contributions?: number;
          generated_at?: string;
          gross_salary?: number;
          id?: string;
          net_salary?: number;
          payroll_entry_id?: string;
          payroll_run_id?: string;
          published_at?: string | null;
          status?: Database['hrms']['Enums']['payslip_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payslips_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payslips_payroll_entry_id_fkey';
            columns: ['payroll_entry_id'];
            isOneToOne: true;
            referencedRelation: 'payroll_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payslips_payroll_run_id_fkey';
            columns: ['payroll_run_id'];
            isOneToOne: false;
            referencedRelation: 'payroll_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      recruitment_candidate_notes: {
        Row: {
          author_employee_id: string | null;
          candidate_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_pinned: boolean;
          note: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          author_employee_id?: string | null;
          candidate_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_pinned?: boolean;
          note: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          author_employee_id?: string | null;
          candidate_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_pinned?: boolean;
          note?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recruitment_candidate_notes_author_employee_id_fkey';
            columns: ['author_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_candidate_notes_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_candidates';
            referencedColumns: ['id'];
          },
        ];
      };
      recruitment_candidates: {
        Row: {
          applied_at: string;
          created_at: string;
          created_by: string | null;
          current_company: string | null;
          current_ctc: number | null;
          current_designation: string | null;
          email: string;
          expected_ctc: number | null;
          experience_years: number | null;
          full_name: string;
          id: string;
          last_activity_at: string;
          notice_period_days: number | null;
          owner_employee_id: string | null;
          phone: string | null;
          requisition_id: string;
          resume_url: string | null;
          source: string | null;
          status: Database['hrms']['Enums']['recruitment_candidate_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          applied_at?: string;
          created_at?: string;
          created_by?: string | null;
          current_company?: string | null;
          current_ctc?: number | null;
          current_designation?: string | null;
          email: string;
          expected_ctc?: number | null;
          experience_years?: number | null;
          full_name: string;
          id?: string;
          last_activity_at?: string;
          notice_period_days?: number | null;
          owner_employee_id?: string | null;
          phone?: string | null;
          requisition_id: string;
          resume_url?: string | null;
          source?: string | null;
          status?: Database['hrms']['Enums']['recruitment_candidate_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          applied_at?: string;
          created_at?: string;
          created_by?: string | null;
          current_company?: string | null;
          current_ctc?: number | null;
          current_designation?: string | null;
          email?: string;
          expected_ctc?: number | null;
          experience_years?: number | null;
          full_name?: string;
          id?: string;
          last_activity_at?: string;
          notice_period_days?: number | null;
          owner_employee_id?: string | null;
          phone?: string | null;
          requisition_id?: string;
          resume_url?: string | null;
          source?: string | null;
          status?: Database['hrms']['Enums']['recruitment_candidate_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recruitment_candidates_owner_employee_id_fkey';
            columns: ['owner_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_candidates_requisition_id_fkey';
            columns: ['requisition_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_requisitions';
            referencedColumns: ['id'];
          },
        ];
      };
      recruitment_interview_feedback: {
        Row: {
          candidate_id: string;
          concerns: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          interview_id: string;
          interviewer_employee_id: string | null;
          rating: number | null;
          recommendation: Database['hrms']['Enums']['recruitment_feedback_recommendation'];
          strengths: string | null;
          submitted_at: string;
          summary: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          candidate_id: string;
          concerns?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          interview_id: string;
          interviewer_employee_id?: string | null;
          rating?: number | null;
          recommendation?: Database['hrms']['Enums']['recruitment_feedback_recommendation'];
          strengths?: string | null;
          submitted_at?: string;
          summary?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          candidate_id?: string;
          concerns?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          interview_id?: string;
          interviewer_employee_id?: string | null;
          rating?: number | null;
          recommendation?: Database['hrms']['Enums']['recruitment_feedback_recommendation'];
          strengths?: string | null;
          submitted_at?: string;
          summary?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recruitment_interview_feedback_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_interview_feedback_interview_id_fkey';
            columns: ['interview_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_interviews';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_interview_feedback_interviewer_employee_id_fkey';
            columns: ['interviewer_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      recruitment_interviews: {
        Row: {
          candidate_id: string;
          created_at: string;
          created_by: string | null;
          duration_minutes: number;
          id: string;
          interviewer_employee_id: string | null;
          location: string | null;
          meeting_link: string | null;
          outcome: string | null;
          requisition_id: string;
          round_type: Database['hrms']['Enums']['recruitment_interview_round_type'];
          scheduled_at: string;
          status: Database['hrms']['Enums']['recruitment_interview_status'];
          title: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          candidate_id: string;
          created_at?: string;
          created_by?: string | null;
          duration_minutes?: number;
          id?: string;
          interviewer_employee_id?: string | null;
          location?: string | null;
          meeting_link?: string | null;
          outcome?: string | null;
          requisition_id: string;
          round_type?: Database['hrms']['Enums']['recruitment_interview_round_type'];
          scheduled_at: string;
          status?: Database['hrms']['Enums']['recruitment_interview_status'];
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          candidate_id?: string;
          created_at?: string;
          created_by?: string | null;
          duration_minutes?: number;
          id?: string;
          interviewer_employee_id?: string | null;
          location?: string | null;
          meeting_link?: string | null;
          outcome?: string | null;
          requisition_id?: string;
          round_type?: Database['hrms']['Enums']['recruitment_interview_round_type'];
          scheduled_at?: string;
          status?: Database['hrms']['Enums']['recruitment_interview_status'];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recruitment_interviews_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_interviews_interviewer_employee_id_fkey';
            columns: ['interviewer_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_interviews_requisition_id_fkey';
            columns: ['requisition_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_requisitions';
            referencedColumns: ['id'];
          },
        ];
      };
      recruitment_offers: {
        Row: {
          approved_by_employee_id: string | null;
          candidate_id: string;
          created_at: string;
          created_by: string | null;
          currency_code: string;
          id: string;
          joining_date: string | null;
          notes: string | null;
          offered_designation: string;
          requisition_id: string;
          responded_at: string | null;
          salary_amount: number;
          sent_at: string | null;
          status: Database['hrms']['Enums']['recruitment_offer_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          approved_by_employee_id?: string | null;
          candidate_id: string;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          id?: string;
          joining_date?: string | null;
          notes?: string | null;
          offered_designation: string;
          requisition_id: string;
          responded_at?: string | null;
          salary_amount: number;
          sent_at?: string | null;
          status?: Database['hrms']['Enums']['recruitment_offer_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          approved_by_employee_id?: string | null;
          candidate_id?: string;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          id?: string;
          joining_date?: string | null;
          notes?: string | null;
          offered_designation?: string;
          requisition_id?: string;
          responded_at?: string | null;
          salary_amount?: number;
          sent_at?: string | null;
          status?: Database['hrms']['Enums']['recruitment_offer_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recruitment_offers_approved_by_employee_id_fkey';
            columns: ['approved_by_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_offers_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_offers_requisition_id_fkey';
            columns: ['requisition_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_requisitions';
            referencedColumns: ['id'];
          },
        ];
      };
      recruitment_onboarding_tasks: {
        Row: {
          candidate_id: string;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          offer_id: string | null;
          owner_employee_id: string | null;
          status: Database['hrms']['Enums']['recruitment_onboarding_status'];
          title: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          candidate_id: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          offer_id?: string | null;
          owner_employee_id?: string | null;
          status?: Database['hrms']['Enums']['recruitment_onboarding_status'];
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          candidate_id?: string;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          offer_id?: string | null;
          owner_employee_id?: string | null;
          status?: Database['hrms']['Enums']['recruitment_onboarding_status'];
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recruitment_onboarding_tasks_candidate_id_fkey';
            columns: ['candidate_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_candidates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_onboarding_tasks_offer_id_fkey';
            columns: ['offer_id'];
            isOneToOne: false;
            referencedRelation: 'recruitment_offers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_onboarding_tasks_owner_employee_id_fkey';
            columns: ['owner_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      recruitment_requisitions: {
        Row: {
          closed_at: string | null;
          compensation_max: number | null;
          compensation_min: number | null;
          created_at: string;
          created_by: string | null;
          department_id: string | null;
          description: string | null;
          employment_type: Database['hrms']['Enums']['recruitment_employment_type'];
          hiring_manager_employee_id: string | null;
          id: string;
          location: string | null;
          openings: number;
          owner_employee_id: string | null;
          priority: Database['hrms']['Enums']['recruitment_priority'];
          requested_by_employee_id: string | null;
          requisition_code: string;
          status: Database['hrms']['Enums']['recruitment_requisition_status'];
          target_start_date: string | null;
          title: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          closed_at?: string | null;
          compensation_max?: number | null;
          compensation_min?: number | null;
          created_at?: string;
          created_by?: string | null;
          department_id?: string | null;
          description?: string | null;
          employment_type?: Database['hrms']['Enums']['recruitment_employment_type'];
          hiring_manager_employee_id?: string | null;
          id?: string;
          location?: string | null;
          openings?: number;
          owner_employee_id?: string | null;
          priority?: Database['hrms']['Enums']['recruitment_priority'];
          requested_by_employee_id?: string | null;
          requisition_code: string;
          status?: Database['hrms']['Enums']['recruitment_requisition_status'];
          target_start_date?: string | null;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          closed_at?: string | null;
          compensation_max?: number | null;
          compensation_min?: number | null;
          created_at?: string;
          created_by?: string | null;
          department_id?: string | null;
          description?: string | null;
          employment_type?: Database['hrms']['Enums']['recruitment_employment_type'];
          hiring_manager_employee_id?: string | null;
          id?: string;
          location?: string | null;
          openings?: number;
          owner_employee_id?: string | null;
          priority?: Database['hrms']['Enums']['recruitment_priority'];
          requested_by_employee_id?: string | null;
          requisition_code?: string;
          status?: Database['hrms']['Enums']['recruitment_requisition_status'];
          target_start_date?: string | null;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recruitment_requisitions_department_id_fkey';
            columns: ['department_id'];
            isOneToOne: false;
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_requisitions_hiring_manager_employee_id_fkey';
            columns: ['hiring_manager_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_requisitions_owner_employee_id_fkey';
            columns: ['owner_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recruitment_requisitions_requested_by_employee_id_fkey';
            columns: ['requested_by_employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      resignation_requests: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          created_by: string | null;
          employee_id: string;
          id: string;
          last_working_day: string | null;
          notice_period_days: number | null;
          notice_waiver_days: number;
          reason: string;
          remarks: string | null;
          resignation_date: string;
          status: Database['hrms']['Enums']['resignation_status'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          employee_id: string;
          id?: string;
          last_working_day?: string | null;
          notice_period_days?: number | null;
          notice_waiver_days?: number;
          reason: string;
          remarks?: string | null;
          resignation_date: string;
          status?: Database['hrms']['Enums']['resignation_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          employee_id?: string;
          id?: string;
          last_working_day?: string | null;
          notice_period_days?: number | null;
          notice_waiver_days?: number;
          reason?: string;
          remarks?: string | null;
          resignation_date?: string;
          status?: Database['hrms']['Enums']['resignation_status'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resignation_requests_accepted_by_fkey';
            columns: ['accepted_by'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resignation_requests_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
        ];
      };
      salary_components: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          is_recurring_default: boolean;
          is_statutory: boolean;
          name: string;
          taxable: boolean;
          type: Database['hrms']['Enums']['salary_component_type'];
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          is_recurring_default?: boolean;
          is_statutory?: boolean;
          name: string;
          taxable?: boolean;
          type: Database['hrms']['Enums']['salary_component_type'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          is_recurring_default?: boolean;
          is_statutory?: boolean;
          name?: string;
          taxable?: boolean;
          type?: Database['hrms']['Enums']['salary_component_type'];
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      salary_structure_components: {
        Row: {
          amount_override: number | null;
          calculation_type: Database['hrms']['Enums']['salary_calculation_type'];
          calculation_value: number;
          created_at: string;
          created_by: string | null;
          display_order: number;
          id: string;
          is_pro_ratable: boolean;
          is_recurring: boolean;
          salary_component_id: string;
          salary_structure_id: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          amount_override?: number | null;
          calculation_type?: Database['hrms']['Enums']['salary_calculation_type'];
          calculation_value?: number;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          id?: string;
          is_pro_ratable?: boolean;
          is_recurring?: boolean;
          salary_component_id: string;
          salary_structure_id: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          amount_override?: number | null;
          calculation_type?: Database['hrms']['Enums']['salary_calculation_type'];
          calculation_value?: number;
          created_at?: string;
          created_by?: string | null;
          display_order?: number;
          id?: string;
          is_pro_ratable?: boolean;
          is_recurring?: boolean;
          salary_component_id?: string;
          salary_structure_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'salary_structure_components_salary_component_id_fkey';
            columns: ['salary_component_id'];
            isOneToOne: false;
            referencedRelation: 'salary_components';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'salary_structure_components_salary_structure_id_fkey';
            columns: ['salary_structure_id'];
            isOneToOne: false;
            referencedRelation: 'salary_structures';
            referencedColumns: ['id'];
          },
        ];
      };
      salary_structures: {
        Row: {
          created_at: string;
          created_by: string | null;
          currency_code: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      shifts: {
        Row: {
          created_at: string;
          created_by: string | null;
          end_time: string;
          grace_minutes: number;
          id: string;
          is_active: boolean;
          name: string;
          start_time: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          end_time: string;
          grace_minutes?: number;
          id?: string;
          is_active?: boolean;
          name: string;
          start_time: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          end_time?: string;
          grace_minutes?: number;
          id?: string;
          is_active?: boolean;
          name?: string;
          start_time?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      announcement_category: 'general' | 'policy' | 'payroll' | 'event';
      announcement_status: 'draft' | 'published' | 'archived';
      asset_clearance_status: 'PENDING' | 'RETURNED' | 'WAIVED';
      asset_return_condition: 'PENDING' | 'GOOD' | 'DAMAGED' | 'LOST';
      attendance_punch_type: 'in' | 'out';
      attendance_record_status: 'present' | 'absent';
      compensation_assignment_status:
        | 'draft'
        | 'active'
        | 'closed'
        | 'cancelled';
      compensation_assignment_type:
        | 'primary'
        | 'secondary'
        | 'contract'
        | 'retainer';
      document_status: 'valid' | 'invalid' | 'pending' | 'expired_soon';
      employee_employment_type:
        | 'full_time'
        | 'part_time'
        | 'contract'
        | 'intern';
      employee_status:
        | 'invited'
        | 'active'
        | 'probation'
        | 'notice_period'
        | 'inactive'
        | 'exited';
      exit_letter_status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
      exit_letter_type: 'RELIEVING' | 'EXPERIENCE';
      exit_task_category: 'IT' | 'ADMIN' | 'HR' | 'FINANCE';
      fnf_settlement_status:
        | 'DRAFT'
        | 'PENDING_APPROVAL'
        | 'APPROVED'
        | 'PAID'
        | 'REJECTED';
      hr_request_category:
        | 'payroll'
        | 'policy'
        | 'personal_details'
        | 'documents'
        | 'benefits'
        | 'other';
      hr_request_priority: 'low' | 'medium' | 'high' | 'urgent';
      hr_request_status: 'open' | 'in_progress' | 'resolved' | 'closed';
      leave_request_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
      pay_frequency: 'monthly' | 'hourly' | 'daily' | 'one_time';
      pay_item_source_type:
        | 'manual'
        | 'bonus'
        | 'incentive'
        | 'reimbursement'
        | 'arrear'
        | 'adjustment'
        | 'attendance'
        | 'statutory';
      pay_item_status: 'draft' | 'approved' | 'cancelled' | 'applied';
      payroll_entry_status:
        | 'draft'
        | 'calculated'
        | 'approved'
        | 'paid'
        | 'cancelled';
      payroll_item_source:
        | 'assignment'
        | 'pay_item'
        | 'attendance'
        | 'statutory'
        | 'manual'
        | 'arrear';
      payroll_run_status:
        | 'draft'
        | 'calculating'
        | 'processed'
        | 'approved'
        | 'paid'
        | 'cancelled';
      payslip_status: 'generated' | 'published' | 'void';
      recruitment_candidate_status:
        | 'sourced'
        | 'applied'
        | 'screening'
        | 'interview'
        | 'shortlisted'
        | 'offered'
        | 'hired'
        | 'rejected'
        | 'withdrawn';
      recruitment_employment_type:
        | 'full_time'
        | 'part_time'
        | 'contract'
        | 'intern';
      recruitment_feedback_recommendation:
        | 'strong_yes'
        | 'yes'
        | 'maybe'
        | 'no';
      recruitment_interview_round_type:
        | 'screening'
        | 'technical'
        | 'managerial'
        | 'panel'
        | 'hr';
      recruitment_interview_status:
        | 'scheduled'
        | 'completed'
        | 'cancelled'
        | 'no_show';
      recruitment_offer_status:
        | 'draft'
        | 'approval_pending'
        | 'sent'
        | 'accepted'
        | 'declined'
        | 'expired';
      recruitment_onboarding_status:
        | 'pending'
        | 'in_progress'
        | 'completed'
        | 'blocked';
      recruitment_priority: 'low' | 'medium' | 'high' | 'urgent';
      recruitment_requisition_status:
        | 'draft'
        | 'open'
        | 'on_hold'
        | 'filled'
        | 'closed'
        | 'cancelled';
      resignation_status:
        | 'SUBMITTED'
        | 'UNDER_REVIEW'
        | 'ACCEPTED'
        | 'RETRACTED';
      salary_calculation_type:
        | 'fixed_amount'
        | 'percentage_of_ctc'
        | 'percentage_of_basic'
        | 'percentage_of_gross'
        | 'formula';
      salary_component_type: 'earning' | 'deduction' | 'employer_contribution';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      account_assignees: {
        Row: {
          account_id: string;
          assigned_at: string;
          assigned_by: string;
          assigned_to_user_id: string;
          assignment_reason: string | null;
          assignment_status: string;
          created_at: string;
          created_by: string;
          id: string;
          is_primary_assignee: boolean;
          notes: string | null;
          unassigned_at: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          account_id: string;
          assigned_at?: string;
          assigned_by: string;
          assigned_to_user_id: string;
          assignment_reason?: string | null;
          assignment_status?: string;
          created_at?: string;
          created_by: string;
          id?: string;
          is_primary_assignee?: boolean;
          notes?: string | null;
          unassigned_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          account_id?: string;
          assigned_at?: string;
          assigned_by?: string;
          assigned_to_user_id?: string;
          assignment_reason?: string | null;
          assignment_status?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          is_primary_assignee?: boolean;
          notes?: string | null;
          unassigned_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'account_assignees_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'crm_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_accounts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      accounts: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          email: string | null;
          id: string;
          is_super_admin: boolean;
          joined_via_invite: boolean;
          name: string;
          picture_url: string | null;
          public_data: Json;
          timezone: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          is_super_admin?: boolean;
          joined_via_invite?: boolean;
          name: string;
          picture_url?: string | null;
          public_data?: Json;
          timezone?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          is_super_admin?: boolean;
          joined_via_invite?: boolean;
          name?: string;
          picture_url?: string | null;
          public_data?: Json;
          timezone?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string;
          entity_name: string | null;
          id: string;
          metadata: Json | null;
          module: string;
          new_data: Json | null;
          old_data: Json | null;
          product_key: string | null;
          workspace_id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_name?: string | null;
          id?: string;
          metadata?: Json | null;
          module: string;
          new_data?: Json | null;
          old_data?: Json | null;
          product_key?: string | null;
          workspace_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_name?: string | null;
          id?: string;
          metadata?: Json | null;
          module?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          product_key?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          idempotency_key: string;
          module_id: string | null;
          occurred_at: string;
          payload: Json;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          idempotency_key: string;
          module_id?: string | null;
          occurred_at?: string;
          payload?: Json;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          idempotency_key?: string;
          module_id?: string | null;
          occurred_at?: string;
          payload?: Json;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'billing_events_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'billing_events_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      billing_provider_prices: {
        Row: {
          billing_cycle: Database['public']['Enums']['billing_cycle'];
          created_at: string;
          id: string;
          is_active: boolean;
          price_ref_id: string;
          price_ref_type: string;
          provider: Database['public']['Enums']['payment_provider'];
          provider_price_id: string | null;
          provider_product_id: string | null;
          updated_at: string;
        };
        Insert: {
          billing_cycle: Database['public']['Enums']['billing_cycle'];
          created_at?: string;
          id?: string;
          is_active?: boolean;
          price_ref_id: string;
          price_ref_type: string;
          provider: Database['public']['Enums']['payment_provider'];
          provider_price_id?: string | null;
          provider_product_id?: string | null;
          updated_at?: string;
        };
        Update: {
          billing_cycle?: Database['public']['Enums']['billing_cycle'];
          created_at?: string;
          id?: string;
          is_active?: boolean;
          price_ref_id?: string;
          price_ref_type?: string;
          provider?: Database['public']['Enums']['payment_provider'];
          provider_price_id?: string | null;
          provider_product_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bundle_modules: {
        Row: {
          bundle_id: string;
          created_at: string;
          id: string;
          module_id: string;
        };
        Insert: {
          bundle_id: string;
          created_at?: string;
          id?: string;
          module_id: string;
        };
        Update: {
          bundle_id?: string;
          created_at?: string;
          id?: string;
          module_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bundle_modules_bundle_id_fkey';
            columns: ['bundle_id'];
            isOneToOne: false;
            referencedRelation: 'bundles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bundle_modules_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
        ];
      };
      bundles: {
        Row: {
          annual_price: number | null;
          bundle_key: string;
          bundle_name: string;
          created_at: string;
          currency: string;
          description: string | null;
          id: string;
          is_active: boolean;
          monthly_price: number | null;
          plan_id: string;
          updated_at: string;
        };
        Insert: {
          annual_price?: number | null;
          bundle_key: string;
          bundle_name: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          monthly_price?: number | null;
          plan_id: string;
          updated_at?: string;
        };
        Update: {
          annual_price?: number | null;
          bundle_key?: string;
          bundle_name?: string;
          created_at?: string;
          currency?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          monthly_price?: number | null;
          plan_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bundles_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          billing_country: string;
          city: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          heard_about_us: string[] | null;
          id: string;
          invoice_address: string | null;
          invoice_city: string | null;
          invoice_postal_code: string | null;
          invoice_state: string | null;
          logo_url: string | null;
          name: string;
          phone: string | null;
          postal_code: string | null;
          state: string | null;
          tax_id: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          billing_country: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          heard_about_us?: string[] | null;
          id?: string;
          invoice_address?: string | null;
          invoice_city?: string | null;
          invoice_postal_code?: string | null;
          invoice_state?: string | null;
          logo_url?: string | null;
          name: string;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          tax_id?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          billing_country?: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          heard_about_us?: string[] | null;
          id?: string;
          invoice_address?: string | null;
          invoice_city?: string | null;
          invoice_postal_code?: string | null;
          invoice_state?: string | null;
          logo_url?: string | null;
          name?: string;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          tax_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'companies_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_assignees: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          assigned_to_user_id: string;
          assignment_reason: string | null;
          assignment_status: string;
          contact_id: string;
          created_at: string;
          created_by: string;
          id: string;
          is_primary_assignee: boolean;
          notes: string | null;
          unassigned_at: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          assigned_to_user_id: string;
          assignment_reason?: string | null;
          assignment_status?: string;
          contact_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          is_primary_assignee?: boolean;
          notes?: string | null;
          unassigned_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          assigned_to_user_id?: string;
          assignment_reason?: string | null;
          assignment_status?: string;
          contact_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          is_primary_assignee?: boolean;
          notes?: string | null;
          unassigned_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_assignees_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'crm_contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_contacts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_accounts: {
        Row: {
          account_name: string;
          account_type: string | null;
          annual_revenue: number | null;
          billing_city: string | null;
          billing_country: string | null;
          billing_postal_code: string | null;
          billing_state: string | null;
          billing_street: string | null;
          company_size: string | null;
          created_at: string;
          created_by: string | null;
          created_from_lead_id: string | null;
          custom_fields: Json | null;
          customer_since: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          employee_count: number | null;
          id: string;
          industry_id: string | null;
          is_deleted: boolean;
          last_activity_date: string | null;
          linkedin_url: string | null;
          owner_id: string | null;
          parent_account_id: string | null;
          phone_number: string | null;
          shipping_city: string | null;
          shipping_country: string | null;
          shipping_postal_code: string | null;
          shipping_state: string | null;
          shipping_street: string | null;
          status_id: string;
          tags: Json | null;
          total_revenue: number | null;
          twitter_handle: string | null;
          updated_at: string;
          updated_by: string | null;
          website: string | null;
          workspace_id: string;
        };
        Insert: {
          account_name: string;
          account_type?: string | null;
          annual_revenue?: number | null;
          billing_city?: string | null;
          billing_country?: string | null;
          billing_postal_code?: string | null;
          billing_state?: string | null;
          billing_street?: string | null;
          company_size?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_from_lead_id?: string | null;
          custom_fields?: Json | null;
          customer_since?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          employee_count?: number | null;
          id?: string;
          industry_id?: string | null;
          is_deleted?: boolean;
          last_activity_date?: string | null;
          linkedin_url?: string | null;
          owner_id?: string | null;
          parent_account_id?: string | null;
          phone_number?: string | null;
          shipping_city?: string | null;
          shipping_country?: string | null;
          shipping_postal_code?: string | null;
          shipping_state?: string | null;
          shipping_street?: string | null;
          status_id: string;
          tags?: Json | null;
          total_revenue?: number | null;
          twitter_handle?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          website?: string | null;
          workspace_id: string;
        };
        Update: {
          account_name?: string;
          account_type?: string | null;
          annual_revenue?: number | null;
          billing_city?: string | null;
          billing_country?: string | null;
          billing_postal_code?: string | null;
          billing_state?: string | null;
          billing_street?: string | null;
          company_size?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_from_lead_id?: string | null;
          custom_fields?: Json | null;
          customer_since?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          employee_count?: number | null;
          id?: string;
          industry_id?: string | null;
          is_deleted?: boolean;
          last_activity_date?: string | null;
          linkedin_url?: string | null;
          owner_id?: string | null;
          parent_account_id?: string | null;
          phone_number?: string | null;
          shipping_city?: string | null;
          shipping_country?: string | null;
          shipping_postal_code?: string | null;
          shipping_state?: string | null;
          shipping_street?: string | null;
          status_id?: string;
          tags?: Json | null;
          total_revenue?: number | null;
          twitter_handle?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          website?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_accounts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'crm_leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_leads_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_industry_id_fkey';
            columns: ['industry_id'];
            isOneToOne: false;
            referencedRelation: 'crm_industries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_parent_account_id_fkey';
            columns: ['parent_account_id'];
            isOneToOne: false;
            referencedRelation: 'crm_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_parent_account_id_fkey';
            columns: ['parent_account_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_accounts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entity_statuses_account_type_fkey';
            columns: ['account_type'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_call_logs: {
        Row: {
          call_type: string;
          comments: string | null;
          contact_name: string | null;
          created_at: string;
          created_by: string | null;
          date_time: string;
          deleted_at: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          is_deleted: boolean;
          status: string;
          subject: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          call_type?: string;
          comments?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          date_time: string;
          deleted_at?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          is_deleted?: boolean;
          status?: string;
          subject: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          call_type?: string;
          comments?: string | null;
          contact_name?: string | null;
          created_at?: string;
          created_by?: string | null;
          date_time?: string;
          deleted_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          is_deleted?: boolean;
          status?: string;
          subject?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_call_logs_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_call_logs_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_contacts: {
        Row: {
          account_id: string | null;
          alt_email: string | null;
          alt_phone: string | null;
          created_at: string;
          created_by: string | null;
          created_from_lead_id: string | null;
          custom_fields: Json | null;
          deleted_at: string | null;
          deleted_by: string | null;
          department: string | null;
          do_not_call: boolean;
          do_not_email: boolean;
          email: string | null;
          email_bounced: boolean;
          first_name: string;
          id: string;
          is_deleted: boolean;
          is_primary: boolean;
          job_title: string | null;
          language: string | null;
          last_contact_date: string | null;
          last_name: string | null;
          linkedin_url: string | null;
          location: string | null;
          mobile_number: string | null;
          notes: string | null;
          owner_id: string | null;
          phone_number: string | null;
          preferred_contact_method: string | null;
          reporting_to_id: string | null;
          status_id: string;
          tags: Json | null;
          timezone: string | null;
          twitter_handle: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          account_id?: string | null;
          alt_email?: string | null;
          alt_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_from_lead_id?: string | null;
          custom_fields?: Json | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          do_not_call?: boolean;
          do_not_email?: boolean;
          email?: string | null;
          email_bounced?: boolean;
          first_name: string;
          id?: string;
          is_deleted?: boolean;
          is_primary?: boolean;
          job_title?: string | null;
          language?: string | null;
          last_contact_date?: string | null;
          last_name?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          mobile_number?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          phone_number?: string | null;
          preferred_contact_method?: string | null;
          reporting_to_id?: string | null;
          status_id: string;
          tags?: Json | null;
          timezone?: string | null;
          twitter_handle?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          account_id?: string | null;
          alt_email?: string | null;
          alt_phone?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_from_lead_id?: string | null;
          custom_fields?: Json | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          do_not_call?: boolean;
          do_not_email?: boolean;
          email?: string | null;
          email_bounced?: boolean;
          first_name?: string;
          id?: string;
          is_deleted?: boolean;
          is_primary?: boolean;
          job_title?: string | null;
          language?: string | null;
          last_contact_date?: string | null;
          last_name?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          mobile_number?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          phone_number?: string | null;
          preferred_contact_method?: string | null;
          reporting_to_id?: string | null;
          status_id?: string;
          tags?: Json | null;
          timezone?: string | null;
          twitter_handle?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_contacts_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'crm_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_accounts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'crm_leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_leads_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_reporting_to_id_fkey';
            columns: ['reporting_to_id'];
            isOneToOne: false;
            referencedRelation: 'crm_contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_reporting_to_id_fkey';
            columns: ['reporting_to_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_contacts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_documents: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          entity_id: string;
          entity_type: string;
          file_path: string;
          file_type: string | null;
          id: string;
          is_deleted: boolean;
          name: string;
          size_bytes: number | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          entity_id: string;
          entity_type: string;
          file_path: string;
          file_type?: string | null;
          id?: string;
          is_deleted?: boolean;
          name: string;
          size_bytes?: number | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          file_path?: string;
          file_type?: string | null;
          id?: string;
          is_deleted?: boolean;
          name?: string;
          size_bytes?: number | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_documents_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_documents_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_industries: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          industry_name: string;
          is_active: boolean;
          is_system: boolean;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          industry_name: string;
          is_active?: boolean;
          is_system?: boolean;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          industry_name?: string;
          is_active?: boolean;
          is_system?: boolean;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_industries_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_industries_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_leads: {
        Row: {
          alt_email: string | null;
          annual_revenue: number | null;
          company_linkedin_url: string | null;
          company_name: string | null;
          company_size: Database['public']['Enums']['company_size'] | null;
          company_website: string | null;
          contacted_count: number;
          created_at: string;
          created_by: string;
          custom_fields: Json | null;
          deleted_at: string | null;
          deleted_by: string | null;
          department: string | null;
          email: string | null;
          first_name: string;
          id: string;
          industry_id: string | null;
          is_deleted: boolean;
          job_title: string | null;
          last_contact_date: string | null;
          last_name: string | null;
          lead_score: number | null;
          linkedin_url: string | null;
          location: string | null;
          mobile_number: string | null;
          next_followup_date: string | null;
          notes: string | null;
          owner_id: string | null;
          phone_number: string | null;
          source_id: string | null;
          status_id: string;
          tags: Json | null;
          timezone: string | null;
          trigger: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          alt_email?: string | null;
          annual_revenue?: number | null;
          company_linkedin_url?: string | null;
          company_name?: string | null;
          company_size?: Database['public']['Enums']['company_size'] | null;
          company_website?: string | null;
          contacted_count?: number;
          created_at?: string;
          created_by: string;
          custom_fields?: Json | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          email?: string | null;
          first_name: string;
          id?: string;
          industry_id?: string | null;
          is_deleted?: boolean;
          job_title?: string | null;
          last_contact_date?: string | null;
          last_name?: string | null;
          lead_score?: number | null;
          linkedin_url?: string | null;
          location?: string | null;
          mobile_number?: string | null;
          next_followup_date?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          phone_number?: string | null;
          source_id?: string | null;
          status_id: string;
          tags?: Json | null;
          timezone?: string | null;
          trigger?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          alt_email?: string | null;
          annual_revenue?: number | null;
          company_linkedin_url?: string | null;
          company_name?: string | null;
          company_size?: Database['public']['Enums']['company_size'] | null;
          company_website?: string | null;
          contacted_count?: number;
          created_at?: string;
          created_by?: string;
          custom_fields?: Json | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          department?: string | null;
          email?: string | null;
          first_name?: string;
          id?: string;
          industry_id?: string | null;
          is_deleted?: boolean;
          job_title?: string | null;
          last_contact_date?: string | null;
          last_name?: string | null;
          lead_score?: number | null;
          linkedin_url?: string | null;
          location?: string | null;
          mobile_number?: string | null;
          next_followup_date?: string | null;
          notes?: string | null;
          owner_id?: string | null;
          phone_number?: string | null;
          source_id?: string | null;
          status_id?: string;
          tags?: Json | null;
          timezone?: string | null;
          trigger?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_leads_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_industry_id_fkey';
            columns: ['industry_id'];
            isOneToOne: false;
            referencedRelation: 'crm_industries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'lead_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_meetings: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          end_time: string;
          entity_id: string;
          entity_type: string;
          id: string;
          is_deleted: boolean;
          location: string | null;
          meeting_link: string | null;
          start_time: string;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          end_time: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          is_deleted?: boolean;
          location?: string | null;
          meeting_link?: string | null;
          start_time: string;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          end_time?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          is_deleted?: boolean;
          location?: string | null;
          meeting_link?: string | null;
          start_time?: string;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_meetings_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_meetings_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_module_features: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          feature_key: string;
          feature_name: string;
          feature_type: Database['public']['Enums']['crm_feature_type'];
          id: string;
          is_active: boolean;
          is_system: boolean;
          module_id: string;
          requires_owner: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          feature_key: string;
          feature_name: string;
          feature_type?: Database['public']['Enums']['crm_feature_type'];
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          module_id: string;
          requires_owner?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          feature_key?: string;
          feature_name?: string;
          feature_type?: Database['public']['Enums']['crm_feature_type'];
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          module_id?: string;
          requires_owner?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_module_features_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'crm_modules';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_modules: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          icon: string | null;
          id: string;
          is_active: boolean;
          is_system: boolean;
          module_key: string;
          module_name: string;
          parent_module_id: string | null;
          product_key: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          module_key: string;
          module_name: string;
          parent_module_id?: string | null;
          product_key?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          module_key?: string;
          module_name?: string;
          parent_module_id?: string | null;
          product_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_modules_parent_module_id_fkey';
            columns: ['parent_module_id'];
            isOneToOne: false;
            referencedRelation: 'crm_modules';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_notes: {
        Row: {
          content: string;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          is_deleted: boolean;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          is_deleted?: boolean;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          is_deleted?: boolean;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_notes_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_notes_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_opportunities: {
        Row: {
          account_id: string;
          actual_close_date: string | null;
          amount: number | null;
          amount_original: number | null;
          base_amount_usd: number | null;
          campaign_id: string | null;
          close_reason: string | null;
          competitor: string | null;
          created_at: string;
          created_by: string | null;
          created_from_lead_id: string | null;
          currency: string | null;
          currency_original: string | null;
          custom_fields: Json | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          exchange_rate_date: string | null;
          exchange_rate_source: string | null;
          exchange_rate_to_usd: number | null;
          expected_close_date: string | null;
          expected_revenue: number | null;
          id: string;
          is_closed: boolean;
          is_deleted: boolean;
          is_won: boolean;
          lead_source: string | null;
          opportunity_name: string;
          opportunity_type: string | null;
          owner_id: string;
          primary_contact_id: string | null;
          priority: string | null;
          probability: number | null;
          stage_history: Json | null;
          stage_id: string;
          tags: Json | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          account_id: string;
          actual_close_date?: string | null;
          amount?: number | null;
          amount_original?: number | null;
          base_amount_usd?: number | null;
          campaign_id?: string | null;
          close_reason?: string | null;
          competitor?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_from_lead_id?: string | null;
          currency?: string | null;
          currency_original?: string | null;
          custom_fields?: Json | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          exchange_rate_date?: string | null;
          exchange_rate_source?: string | null;
          exchange_rate_to_usd?: number | null;
          expected_close_date?: string | null;
          expected_revenue?: number | null;
          id?: string;
          is_closed?: boolean;
          is_deleted?: boolean;
          is_won?: boolean;
          lead_source?: string | null;
          opportunity_name: string;
          opportunity_type?: string | null;
          owner_id: string;
          primary_contact_id?: string | null;
          priority?: string | null;
          probability?: number | null;
          stage_history?: Json | null;
          stage_id: string;
          tags?: Json | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          account_id?: string;
          actual_close_date?: string | null;
          amount?: number | null;
          amount_original?: number | null;
          base_amount_usd?: number | null;
          campaign_id?: string | null;
          close_reason?: string | null;
          competitor?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_from_lead_id?: string | null;
          currency?: string | null;
          currency_original?: string | null;
          custom_fields?: Json | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          exchange_rate_date?: string | null;
          exchange_rate_source?: string | null;
          exchange_rate_to_usd?: number | null;
          expected_close_date?: string | null;
          expected_revenue?: number | null;
          id?: string;
          is_closed?: boolean;
          is_deleted?: boolean;
          is_won?: boolean;
          lead_source?: string | null;
          opportunity_name?: string;
          opportunity_type?: string | null;
          owner_id?: string;
          primary_contact_id?: string | null;
          priority?: string | null;
          probability?: number | null;
          stage_history?: Json | null;
          stage_id?: string;
          tags?: Json | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_opportunities_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'crm_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_accounts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'crm_leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_leads_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_deleted_by_fkey';
            columns: ['deleted_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_primary_contact_id_fkey';
            columns: ['primary_contact_id'];
            isOneToOne: false;
            referencedRelation: 'crm_contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_primary_contact_id_fkey';
            columns: ['primary_contact_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_contacts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_stage_id_fkey';
            columns: ['stage_id'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      crm_reminders: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          due_date: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          is_completed: boolean;
          is_deleted: boolean;
          priority: string | null;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          is_completed?: boolean;
          is_deleted?: boolean;
          priority?: string | null;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          is_completed?: boolean;
          is_deleted?: boolean;
          priority?: string | null;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_reminders_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_reminders_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_reminders_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      email_account_access_grants: {
        Row: {
          can_send: boolean;
          created_at: string;
          created_by: string | null;
          email_account_id: number;
          grantee_user_id: string;
          id: string;
          workspace_id: string;
        };
        Insert: {
          can_send?: boolean;
          created_at?: string;
          created_by?: string | null;
          email_account_id: number;
          grantee_user_id: string;
          id?: string;
          workspace_id: string;
        };
        Update: {
          can_send?: boolean;
          created_at?: string;
          created_by?: string | null;
          email_account_id?: number;
          grantee_user_id?: string;
          id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_account_access_grants_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_account_access_grants_email_account_workspace_fkey';
            columns: ['email_account_id', 'workspace_id'];
            isOneToOne: false;
            referencedRelation: 'email_accounts';
            referencedColumns: ['id', 'workspace_id'];
          },
          {
            foreignKeyName: 'email_account_access_grants_grantee_user_id_fkey';
            columns: ['grantee_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      email_accounts: {
        Row: {
          access_scope: Database['public']['Enums']['email_account_access_scope'];
          access_token: string | null;
          created_at: string | null;
          created_by: string | null;
          email: string;
          expires_at: string | null;
          from_name: string | null;
          history_id: string | null;
          host: string | null;
          id: number;
          imap_host: string | null;
          imap_port: number | null;
          imap_secure: boolean | null;
          is_active: boolean | null;
          is_sync_enabled: boolean | null;
          last_synced_at: string | null;
          owner_user_id: string;
          password: string | null;
          port: number | null;
          provider: Database['public']['Enums']['email_provider'];
          refresh_token: string | null;
          secure: boolean | null;
          updated_at: string | null;
          updated_by: string | null;
          username: string | null;
          workspace_id: string;
        };
        Insert: {
          access_scope?: Database['public']['Enums']['email_account_access_scope'];
          access_token?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          email: string;
          expires_at?: string | null;
          from_name?: string | null;
          history_id?: string | null;
          host?: string | null;
          id?: number;
          imap_host?: string | null;
          imap_port?: number | null;
          imap_secure?: boolean | null;
          is_active?: boolean | null;
          is_sync_enabled?: boolean | null;
          last_synced_at?: string | null;
          owner_user_id: string;
          password?: string | null;
          port?: number | null;
          provider?: Database['public']['Enums']['email_provider'];
          refresh_token?: string | null;
          secure?: boolean | null;
          updated_at?: string | null;
          updated_by?: string | null;
          username?: string | null;
          workspace_id: string;
        };
        Update: {
          access_scope?: Database['public']['Enums']['email_account_access_scope'];
          access_token?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          email?: string;
          expires_at?: string | null;
          from_name?: string | null;
          history_id?: string | null;
          host?: string | null;
          id?: number;
          imap_host?: string | null;
          imap_port?: number | null;
          imap_secure?: boolean | null;
          is_active?: boolean | null;
          is_sync_enabled?: boolean | null;
          last_synced_at?: string | null;
          owner_user_id?: string;
          password?: string | null;
          port?: number | null;
          provider?: Database['public']['Enums']['email_provider'];
          refresh_token?: string | null;
          secure?: boolean | null;
          updated_at?: string | null;
          updated_by?: string | null;
          username?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_accounts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_accounts_owner_user_id_fkey';
            columns: ['owner_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_accounts_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_accounts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      email_sends: {
        Row: {
          created_at: string | null;
          error: string | null;
          from_email: string;
          id: number;
          provider_message_id: string | null;
          rendered_html: string | null;
          rendered_text: string | null;
          status: string | null;
          subject: string | null;
          template_id: number | null;
          thread_id: string | null;
          to_email: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          error?: string | null;
          from_email: string;
          id?: number;
          provider_message_id?: string | null;
          rendered_html?: string | null;
          rendered_text?: string | null;
          status?: string | null;
          subject?: string | null;
          template_id?: number | null;
          thread_id?: string | null;
          to_email: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          error?: string | null;
          from_email?: string;
          id?: number;
          provider_message_id?: string | null;
          rendered_html?: string | null;
          rendered_text?: string | null;
          status?: string | null;
          subject?: string | null;
          template_id?: number | null;
          thread_id?: string | null;
          to_email?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'email_sends_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_email_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'email_sends_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      emails: {
        Row: {
          bcc_emails: string | null;
          cc_emails: string | null;
          created_at: string | null;
          created_by: string | null;
          deleted_at: string | null;
          direction: string | null;
          entity_id: string | null;
          entity_type: string | null;
          from_email: string | null;
          gmail_message_id: string | null;
          html_body: string | null;
          id: string;
          received_at: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          snippet: string | null;
          status: string | null;
          subject: string | null;
          text_body: string | null;
          to_emails: string | null;
          updated_at: string | null;
          workspace_id: string;
        };
        Insert: {
          bcc_emails?: string | null;
          cc_emails?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          direction?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          from_email?: string | null;
          gmail_message_id?: string | null;
          html_body?: string | null;
          id?: string;
          received_at?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          snippet?: string | null;
          status?: string | null;
          subject?: string | null;
          text_body?: string | null;
          to_emails?: string | null;
          updated_at?: string | null;
          workspace_id: string;
        };
        Update: {
          bcc_emails?: string | null;
          cc_emails?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          direction?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          from_email?: string | null;
          gmail_message_id?: string | null;
          html_body?: string | null;
          id?: string;
          received_at?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          snippet?: string | null;
          status?: string | null;
          subject?: string | null;
          text_body?: string | null;
          to_emails?: string | null;
          updated_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'emails_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emails_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      entity_statuses: {
        Row: {
          auto_actions: Json | null;
          color: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          is_closed: boolean;
          is_default: boolean;
          is_system: boolean;
          module_id: string;
          sort_order: number;
          status_key: string;
          status_name: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          auto_actions?: Json | null;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_closed?: boolean;
          is_default?: boolean;
          is_system?: boolean;
          module_id: string;
          sort_order?: number;
          status_key: string;
          status_name: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          auto_actions?: Json | null;
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_closed?: boolean;
          is_default?: boolean;
          is_system?: boolean;
          module_id?: string;
          sort_order?: number;
          status_key?: string;
          status_name?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'entity_statuses_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entity_statuses_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'crm_modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entity_statuses_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entity_statuses_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      feature_catalog: {
        Row: {
          created_at: string;
          data_type: string;
          description: string | null;
          feature_category: string | null;
          feature_key: string;
          feature_name: string;
          id: string;
          is_active: boolean;
          module_id: string;
          updated_at: string;
          usage_metric: string | null;
        };
        Insert: {
          created_at?: string;
          data_type: string;
          description?: string | null;
          feature_category?: string | null;
          feature_key: string;
          feature_name: string;
          id?: string;
          is_active?: boolean;
          module_id: string;
          updated_at?: string;
          usage_metric?: string | null;
        };
        Update: {
          created_at?: string;
          data_type?: string;
          description?: string | null;
          feature_category?: string | null;
          feature_key?: string;
          feature_name?: string;
          id?: string;
          is_active?: boolean;
          module_id?: string;
          updated_at?: string;
          usage_metric?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'feature_catalog_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_assignees: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          assigned_to_user_id: string;
          assignment_reason: string | null;
          assignment_status: string;
          created_at: string;
          created_by: string;
          id: string;
          is_primary_assignee: boolean;
          lead_id: string;
          notes: string | null;
          unassigned_at: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          assigned_to_user_id: string;
          assignment_reason?: string | null;
          assignment_status?: string;
          created_at?: string;
          created_by: string;
          id?: string;
          is_primary_assignee?: boolean;
          lead_id: string;
          notes?: string | null;
          unassigned_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          assigned_to_user_id?: string;
          assignment_reason?: string | null;
          assignment_status?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          is_primary_assignee?: boolean;
          lead_id?: string;
          notes?: string | null;
          unassigned_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_assignees_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'crm_leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_leads_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_sources: {
        Row: {
          color: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          is_system: boolean;
          sort_order: number;
          source_key: string;
          source_name: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          sort_order?: number;
          source_key: string;
          source_name: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          sort_order?: number;
          source_key?: string;
          source_name?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_sources_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_sources_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_sources_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      meeting_notifications_sent: {
        Row: {
          id: string;
          interval_minutes: number;
          meeting_id: string;
          sent_at: string;
          sent_to: string;
        };
        Insert: {
          id?: string;
          interval_minutes: number;
          meeting_id: string;
          sent_at?: string;
          sent_to: string;
        };
        Update: {
          id?: string;
          interval_minutes?: number;
          meeting_id?: string;
          sent_at?: string;
          sent_to?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'meeting_notifications_sent_meeting_id_fkey';
            columns: ['meeting_id'];
            isOneToOne: false;
            referencedRelation: 'crm_meetings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'meeting_notifications_sent_sent_to_fkey';
            columns: ['sent_to'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      module_entitlements: {
        Row: {
          created_at: string;
          entitlement_type: Database['public']['Enums']['entitlement_type'];
          granted_by: string | null;
          granted_seats: number | null;
          id: string;
          is_active: boolean;
          product_id: string;
          reason: string;
          revoke_reason: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          updated_at: string;
          valid_from: string;
          valid_until: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          entitlement_type: Database['public']['Enums']['entitlement_type'];
          granted_by?: string | null;
          granted_seats?: number | null;
          id?: string;
          is_active?: boolean;
          product_id: string;
          reason: string;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          entitlement_type?: Database['public']['Enums']['entitlement_type'];
          granted_by?: string | null;
          granted_seats?: number | null;
          id?: string;
          is_active?: boolean;
          product_id?: string;
          reason?: string;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          updated_at?: string;
          valid_from?: string;
          valid_until?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'module_entitlements_granted_by_fkey';
            columns: ['granted_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_entitlements_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_entitlements_revoked_by_fkey';
            columns: ['revoked_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_entitlements_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      module_plan_prices: {
        Row: {
          annual_price: number | null;
          billing_unit: string;
          created_at: string;
          currency: string;
          id: string;
          is_active: boolean;
          module_id: string;
          monthly_price: number | null;
          plan_id: string;
          updated_at: string;
        };
        Insert: {
          annual_price?: number | null;
          billing_unit: string;
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          module_id: string;
          monthly_price?: number | null;
          plan_id: string;
          updated_at?: string;
        };
        Update: {
          annual_price?: number | null;
          billing_unit?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          is_active?: boolean;
          module_id?: string;
          monthly_price?: number | null;
          plan_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'module_plan_prices_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'module_plan_prices_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      opportunity_assignees: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          assigned_to_user_id: string;
          assignment_reason: string | null;
          assignment_status: string;
          created_at: string;
          created_by: string;
          id: string;
          is_primary_assignee: boolean;
          notes: string | null;
          opportunity_id: string;
          unassigned_at: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          assigned_to_user_id: string;
          assignment_reason?: string | null;
          assignment_status?: string;
          created_at?: string;
          created_by: string;
          id?: string;
          is_primary_assignee?: boolean;
          notes?: string | null;
          opportunity_id: string;
          unassigned_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          assigned_to_user_id?: string;
          assignment_reason?: string | null;
          assignment_status?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          is_primary_assignee?: boolean;
          notes?: string | null;
          opportunity_id?: string;
          unassigned_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'opportunity_assignees_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'crm_opportunities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_opportunities_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          payload: Json;
          payment_provider: Database['public']['Enums']['payment_provider'];
          processed_at: string | null;
          processing_error: string | null;
          provider_event_id: string;
          seat_id: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          payload?: Json;
          payment_provider: Database['public']['Enums']['payment_provider'];
          processed_at?: string | null;
          processing_error?: string | null;
          provider_event_id: string;
          seat_id?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
          payment_provider?: Database['public']['Enums']['payment_provider'];
          processed_at?: string | null;
          processing_error?: string | null;
          provider_event_id?: string;
          seat_id?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_events_seat_id_fkey';
            columns: ['seat_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_module_seats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_events_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_entitlements: {
        Row: {
          created_at: string;
          enum_value: string | null;
          feature_id: string;
          id: string;
          is_enabled: boolean;
          limit_type: string;
          limit_value: number | null;
          module_id: string;
          plan_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enum_value?: string | null;
          feature_id: string;
          id?: string;
          is_enabled?: boolean;
          limit_type: string;
          limit_value?: number | null;
          module_id: string;
          plan_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enum_value?: string | null;
          feature_id?: string;
          id?: string;
          is_enabled?: boolean;
          limit_type?: string;
          limit_value?: number | null;
          module_id?: string;
          plan_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_entitlements_feature_module_fkey';
            columns: ['feature_id', 'module_id'];
            isOneToOne: false;
            referencedRelation: 'feature_catalog';
            referencedColumns: ['id', 'module_id'];
          },
          {
            foreignKeyName: 'plan_entitlements_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_entitlements_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          created_at: string;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          is_paid: boolean;
          is_trial_eligible: boolean;
          parent_plan_id: string | null;
          plan_key: string;
          plan_name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          is_paid?: boolean;
          is_trial_eligible?: boolean;
          parent_plan_id?: string | null;
          plan_key: string;
          plan_name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          is_paid?: boolean;
          is_trial_eligible?: boolean;
          parent_plan_id?: string | null;
          plan_key?: string;
          plan_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_parent_plan_id_fkey';
            columns: ['parent_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_backfill_runs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          executed_by: string | null;
          id: string;
          operation_key: string;
          started_at: string;
          status: string;
          summary: Json;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          executed_by?: string | null;
          id?: string;
          operation_key: string;
          started_at?: string;
          status: string;
          summary?: Json;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          executed_by?: string | null;
          id?: string;
          operation_key?: string;
          started_at?: string;
          status?: string;
          summary?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'pricing_backfill_runs_executed_by_fkey';
            columns: ['executed_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      product_module_map: {
        Row: {
          access_mode: string;
          created_at: string;
          crm_module_id: string;
          id: string;
          product_id: string;
        };
        Insert: {
          access_mode?: string;
          created_at?: string;
          crm_module_id: string;
          id?: string;
          product_id: string;
        };
        Update: {
          access_mode?: string;
          created_at?: string;
          crm_module_id?: string;
          id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'product_module_map_crm_module_id_fkey';
            columns: ['crm_module_id'];
            isOneToOne: false;
            referencedRelation: 'crm_modules';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_module_map_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
        ];
      };
      reminder_notifications_sent: {
        Row: {
          id: string;
          reminder_id: string;
          sent_at: string;
          sent_to: string;
        };
        Insert: {
          id?: string;
          reminder_id: string;
          sent_at?: string;
          sent_to: string;
        };
        Update: {
          id?: string;
          reminder_id?: string;
          sent_at?: string;
          sent_to?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminder_notifications_sent_sent_to_fkey';
            columns: ['sent_to'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      role_permissions: {
        Row: {
          access_level: Database['public']['Enums']['permission_access_level'];
          can_access: boolean;
          can_override_owner: boolean;
          can_view_sensitive_data: boolean;
          conditions: Json | null;
          created_at: string;
          created_by: string | null;
          id: string;
          module_feature_id: string;
          role_id: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          access_level?: Database['public']['Enums']['permission_access_level'];
          can_access?: boolean;
          can_override_owner?: boolean;
          can_view_sensitive_data?: boolean;
          conditions?: Json | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          module_feature_id: string;
          role_id: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          access_level?: Database['public']['Enums']['permission_access_level'];
          can_access?: boolean;
          can_override_owner?: boolean;
          can_view_sensitive_data?: boolean;
          conditions?: Json | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          module_feature_id?: string;
          role_id?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_module_feature_id_fkey';
            columns: ['module_feature_id'];
            isOneToOne: false;
            referencedRelation: 'crm_module_features';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      seat_assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          product_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          seat_id: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          product_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          seat_id: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          product_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          seat_id?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'seat_assignments_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seat_assignments_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seat_assignments_revoked_by_fkey';
            columns: ['revoked_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seat_assignments_seat_id_fkey';
            columns: ['seat_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_module_seats';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seat_assignments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'seat_assignments_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_changes: {
        Row: {
          applied_at: string | null;
          cancelled_at: string | null;
          change_type: string;
          created_at: string;
          created_by: string | null;
          effective_at: string;
          from_plan_id: string | null;
          id: string;
          notes: string | null;
          status: string;
          to_plan_id: string | null;
          updated_at: string;
          workspace_id: string;
          workspace_module_subscription_id: string | null;
        };
        Insert: {
          applied_at?: string | null;
          cancelled_at?: string | null;
          change_type: string;
          created_at?: string;
          created_by?: string | null;
          effective_at: string;
          from_plan_id?: string | null;
          id?: string;
          notes?: string | null;
          status?: string;
          to_plan_id?: string | null;
          updated_at?: string;
          workspace_id: string;
          workspace_module_subscription_id?: string | null;
        };
        Update: {
          applied_at?: string | null;
          cancelled_at?: string | null;
          change_type?: string;
          created_at?: string;
          created_by?: string | null;
          effective_at?: string;
          from_plan_id?: string | null;
          id?: string;
          notes?: string | null;
          status?: string;
          to_plan_id?: string | null;
          updated_at?: string;
          workspace_id?: string;
          workspace_module_subscription_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_changes_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_changes_from_plan_id_fkey';
            columns: ['from_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_changes_module_subscription_fkey';
            columns: ['workspace_module_subscription_id', 'workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_module_subscriptions';
            referencedColumns: ['id', 'workspace_id'];
          },
          {
            foreignKeyName: 'subscription_changes_to_plan_id_fkey';
            columns: ['to_plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_changes_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_notifications: {
        Row: {
          action_url: string | null;
          channel: string;
          created_at: string;
          delivered_at: string | null;
          delivery_error: string | null;
          delivery_status: string;
          event_key: string;
          event_type: string;
          id: string;
          message: string;
          metadata: Json;
          read_at: string | null;
          recipient_id: string;
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          action_url?: string | null;
          channel: string;
          created_at?: string;
          delivered_at?: string | null;
          delivery_error?: string | null;
          delivery_status?: string;
          event_key: string;
          event_type: string;
          id?: string;
          message: string;
          metadata?: Json;
          read_at?: string | null;
          recipient_id: string;
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          action_url?: string | null;
          channel?: string;
          created_at?: string;
          delivered_at?: string | null;
          delivery_error?: string | null;
          delivery_status?: string;
          event_key?: string;
          event_type?: string;
          id?: string;
          message?: string;
          metadata?: Json;
          read_at?: string | null;
          recipient_id?: string;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_notifications_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_products: {
        Row: {
          created_at: string;
          currency: string;
          description: string | null;
          display_name: string;
          id: string;
          india_monthly_price_per_seat: number | null;
          india_yearly_price_per_seat: number | null;
          is_active: boolean;
          is_public: boolean;
          min_seats: number;
          monthly_price_per_seat: number | null;
          product_key: string;
          stripe_india_monthly_price_id: string | null;
          stripe_india_yearly_price_id: string | null;
          stripe_monthly_price_id: string | null;
          stripe_product_id: string | null;
          stripe_yearly_price_id: string | null;
          updated_at: string;
          yearly_price_per_seat: number | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          description?: string | null;
          display_name: string;
          id?: string;
          india_monthly_price_per_seat?: number | null;
          india_yearly_price_per_seat?: number | null;
          is_active?: boolean;
          is_public?: boolean;
          min_seats?: number;
          monthly_price_per_seat?: number | null;
          product_key: string;
          stripe_india_monthly_price_id?: string | null;
          stripe_india_yearly_price_id?: string | null;
          stripe_monthly_price_id?: string | null;
          stripe_product_id?: string | null;
          stripe_yearly_price_id?: string | null;
          updated_at?: string;
          yearly_price_per_seat?: number | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          description?: string | null;
          display_name?: string;
          id?: string;
          india_monthly_price_per_seat?: number | null;
          india_yearly_price_per_seat?: number | null;
          is_active?: boolean;
          is_public?: boolean;
          min_seats?: number;
          monthly_price_per_seat?: number | null;
          product_key?: string;
          stripe_india_monthly_price_id?: string | null;
          stripe_india_yearly_price_id?: string | null;
          stripe_monthly_price_id?: string | null;
          stripe_product_id?: string | null;
          stripe_yearly_price_id?: string | null;
          updated_at?: string;
          yearly_price_per_seat?: number | null;
        };
        Relationships: [];
      };
      usage_counters: {
        Row: {
          current_usage: number;
          feature_id: string;
          id: string;
          last_updated_at: string;
          limit_value: number | null;
          module_id: string;
          workspace_id: string;
        };
        Insert: {
          current_usage?: number;
          feature_id: string;
          id?: string;
          last_updated_at?: string;
          limit_value?: number | null;
          module_id: string;
          workspace_id: string;
        };
        Update: {
          current_usage?: number;
          feature_id?: string;
          id?: string;
          last_updated_at?: string;
          limit_value?: number | null;
          module_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_counters_feature_module_fkey';
            columns: ['feature_id', 'module_id'];
            isOneToOne: false;
            referencedRelation: 'feature_catalog';
            referencedColumns: ['id', 'module_id'];
          },
          {
            foreignKeyName: 'usage_counters_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'usage_counters_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      usage_events: {
        Row: {
          event_type: string;
          feature_id: string;
          id: string;
          metadata: Json;
          module_id: string;
          occurred_at: string;
          quantity: number;
          resource_id: string | null;
          resource_type: string | null;
          workspace_id: string;
        };
        Insert: {
          event_type: string;
          feature_id: string;
          id?: string;
          metadata?: Json;
          module_id: string;
          occurred_at?: string;
          quantity?: number;
          resource_id?: string | null;
          resource_type?: string | null;
          workspace_id: string;
        };
        Update: {
          event_type?: string;
          feature_id?: string;
          id?: string;
          metadata?: Json;
          module_id?: string;
          occurred_at?: string;
          quantity?: number;
          resource_id?: string | null;
          resource_type?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_events_feature_module_fkey';
            columns: ['feature_id', 'module_id'];
            isOneToOne: false;
            referencedRelation: 'feature_catalog';
            referencedColumns: ['id', 'module_id'];
          },
          {
            foreignKeyName: 'usage_events_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'usage_events_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      user_module_interests: {
        Row: {
          created_at: string;
          id: string;
          is_interested: boolean;
          module_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_interested?: boolean;
          module_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_interested?: boolean;
          module_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_module_interests_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_billing_accounts: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          metadata: Json;
          provider: Database['public']['Enums']['payment_provider'];
          provider_customer_id: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metadata?: Json;
          provider: Database['public']['Enums']['payment_provider'];
          provider_customer_id?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          metadata?: Json;
          provider?: Database['public']['Enums']['payment_provider'];
          provider_customer_id?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_billing_accounts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_billing_subscriptions: {
        Row: {
          billing_account_id: string;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          metadata: Json;
          provider_status: string;
          provider_subscription_id: string;
          updated_at: string;
          workspace_id: string;
          workspace_subscription_id: string;
        };
        Insert: {
          billing_account_id: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          metadata?: Json;
          provider_status: string;
          provider_subscription_id: string;
          updated_at?: string;
          workspace_id: string;
          workspace_subscription_id: string;
        };
        Update: {
          billing_account_id?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          metadata?: Json;
          provider_status?: string;
          provider_subscription_id?: string;
          updated_at?: string;
          workspace_id?: string;
          workspace_subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_billing_subscriptions_billing_account_fkey';
            columns: ['billing_account_id', 'workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_billing_accounts';
            referencedColumns: ['id', 'workspace_id'];
          },
          {
            foreignKeyName: 'workspace_billing_subscriptions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_billing_subscriptions_workspace_subscription_fkey';
            columns: ['workspace_subscription_id', 'workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_subscriptions';
            referencedColumns: ['id', 'workspace_id'];
          },
        ];
      };
      workspace_email_templates: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          html_body: string;
          id: number;
          is_active: boolean | null;
          name: string;
          slug: string;
          subject: string;
          text_body: string | null;
          updated_at: string | null;
          updated_by: string | null;
          variables: Json | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          html_body: string;
          id?: number;
          is_active?: boolean | null;
          name: string;
          slug: string;
          subject: string;
          text_body?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          variables?: Json | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          html_body?: string;
          id?: number;
          is_active?: boolean | null;
          name?: string;
          slug?: string;
          subject?: string;
          text_body?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          variables?: Json | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_email_templates_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_email_templates_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_email_templates_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_email_variables: {
        Row: {
          created_at: string | null;
          id: number;
          key: string;
          updated_at: string | null;
          value: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: number;
          key: string;
          updated_at?: string | null;
          value: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: number;
          key?: string;
          updated_at?: string | null;
          value?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_email_variables_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          id: string;
          invited_at: string;
          invited_by: string | null;
          is_primary_contact: boolean;
          personal_settings: Json | null;
          product_key: string | null;
          role_id: string;
          status: Database['public']['Enums']['invitation_status'];
          token: string | null;
          token_expires_at: string | null;
          updated_at: string;
          user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          invited_at?: string;
          invited_by?: string | null;
          is_primary_contact?: boolean;
          personal_settings?: Json | null;
          product_key?: string | null;
          role_id: string;
          status?: Database['public']['Enums']['invitation_status'];
          token?: string | null;
          token_expires_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          invited_at?: string;
          invited_by?: string | null;
          is_primary_contact?: boolean;
          personal_settings?: Json | null;
          product_key?: string | null;
          role_id?: string;
          status?: Database['public']['Enums']['invitation_status'];
          token?: string | null;
          token_expires_at?: string | null;
          updated_at?: string;
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_invitations_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_invitations_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_members: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          id: string;
          invited_at: string | null;
          invited_by: string | null;
          is_primary_contact: boolean;
          personal_settings: Json | null;
          product_id: string | null;
          product_key: string | null;
          role_id: string;
          status: Database['public']['Enums']['workspace_member_status'];
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          is_primary_contact?: boolean;
          personal_settings?: Json | null;
          product_id?: string | null;
          product_key?: string | null;
          role_id: string;
          status?: Database['public']['Enums']['workspace_member_status'];
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          is_primary_contact?: boolean;
          personal_settings?: Json | null;
          product_id?: string | null;
          product_key?: string | null;
          role_id?: string;
          status?: Database['public']['Enums']['workspace_member_status'];
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_members_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_members_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_roles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_module_seats: {
        Row: {
          billing_cycle: Database['public']['Enums']['billing_cycle'];
          created_at: string;
          created_by: string | null;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          payment_provider: Database['public']['Enums']['payment_provider'];
          product_id: string;
          provider_customer_id: string | null;
          provider_metadata: Json;
          provider_subscription_id: string | null;
          seats_purchased: number;
          seats_used: number;
          status: Database['public']['Enums']['seat_subscription_status'];
          trial_ends_at: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          billing_cycle?: Database['public']['Enums']['billing_cycle'];
          created_at?: string;
          created_by?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          payment_provider?: Database['public']['Enums']['payment_provider'];
          product_id: string;
          provider_customer_id?: string | null;
          provider_metadata?: Json;
          provider_subscription_id?: string | null;
          seats_purchased?: number;
          seats_used?: number;
          status?: Database['public']['Enums']['seat_subscription_status'];
          trial_ends_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          billing_cycle?: Database['public']['Enums']['billing_cycle'];
          created_at?: string;
          created_by?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          payment_provider?: Database['public']['Enums']['payment_provider'];
          product_id?: string;
          provider_customer_id?: string | null;
          provider_metadata?: Json;
          provider_subscription_id?: string | null;
          seats_purchased?: number;
          seats_used?: number;
          status?: Database['public']['Enums']['seat_subscription_status'];
          trial_ends_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_module_seats_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_seats_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_seats_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_seats_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_module_subscriptions: {
        Row: {
          annual_amount: number | null;
          bundle_id: string | null;
          cancelled_at: string | null;
          created_at: string;
          id: string;
          module_id: string;
          monthly_amount: number | null;
          plan_id: string;
          started_at: string | null;
          status: string;
          updated_at: string;
          workspace_id: string;
          workspace_subscription_id: string;
        };
        Insert: {
          annual_amount?: number | null;
          bundle_id?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          id?: string;
          module_id: string;
          monthly_amount?: number | null;
          plan_id: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id: string;
          workspace_subscription_id: string;
        };
        Update: {
          annual_amount?: number | null;
          bundle_id?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          id?: string;
          module_id?: string;
          monthly_amount?: number | null;
          plan_id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
          workspace_subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_module_subscriptions_bundle_id_fkey';
            columns: ['bundle_id'];
            isOneToOne: false;
            referencedRelation: 'bundles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_subscriptions_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_subscriptions_workspace_fkey';
            columns: ['workspace_subscription_id', 'workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_subscriptions';
            referencedColumns: ['id', 'workspace_id'];
          },
          {
            foreignKeyName: 'workspace_module_subscriptions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_module_users: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          created_at: string;
          id: string;
          module_id: string;
          removed_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          created_at?: string;
          id?: string;
          module_id: string;
          removed_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          created_at?: string;
          id?: string;
          module_id?: string;
          removed_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_module_users_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_users_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_users_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_module_users_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_roles: {
        Row: {
          color: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          hierarchy_level: number;
          id: string;
          is_active: boolean;
          is_system: boolean;
          product_key: string;
          role_key: string;
          role_name: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          hierarchy_level?: number;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          product_key?: string;
          role_key: string;
          role_name: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          hierarchy_level?: number;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          product_key?: string;
          role_key?: string;
          role_name?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_roles_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_subscriptions: {
        Row: {
          billing_cycle: Database['public']['Enums']['billing_cycle'];
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          subscription_status: string;
          trial_end_date: string | null;
          trial_start_date: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          billing_cycle?: Database['public']['Enums']['billing_cycle'];
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          subscription_status?: string;
          trial_end_date?: string | null;
          trial_start_date?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          billing_cycle?: Database['public']['Enums']['billing_cycle'];
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          subscription_status?: string;
          trial_end_date?: string | null;
          trial_start_date?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_subscriptions_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: true;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_team_members: {
        Row: {
          assigned_by: string | null;
          created_at: string;
          id: string;
          is_manager: boolean;
          team_id: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          assigned_by?: string | null;
          created_at?: string;
          id?: string;
          is_manager?: boolean;
          team_id: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          assigned_by?: string | null;
          created_at?: string;
          id?: string;
          is_manager?: boolean;
          team_id?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_team_members_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'workspace_teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_team_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_team_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_teams: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_teams_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_teams_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspace_teams_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspaces: {
        Row: {
          company_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          icon_url: string | null;
          id: string;
          is_active: boolean;
          is_onboarding_finished: boolean;
          is_subscribed_for_updates: boolean;
          logo_url: string | null;
          name: string;
          owner_id: string;
          product_preferences: Json;
          settings: Json | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          is_onboarding_finished?: boolean;
          is_subscribed_for_updates?: boolean;
          logo_url?: string | null;
          name: string;
          owner_id: string;
          product_preferences?: Json;
          settings?: Json | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          is_active?: boolean;
          is_onboarding_finished?: boolean;
          is_subscribed_for_updates?: boolean;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          product_preferences?: Json;
          settings?: Json | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspaces_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workspaces_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      account_assignees_with_details: {
        Row: {
          account_id: string | null;
          assigned_at: string | null;
          assigned_to_user_id: string | null;
          assignee_email: string | null;
          assignee_name: string | null;
          assignee_picture: string | null;
          assignment_reason: string | null;
          assignment_status: string | null;
          id: string | null;
          is_primary_assignee: boolean | null;
          notes: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'account_assignees_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'crm_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_accounts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'account_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_assignees_with_details: {
        Row: {
          assigned_at: string | null;
          assigned_to_user_id: string | null;
          assignee_email: string | null;
          assignee_name: string | null;
          assignee_picture: string | null;
          assignment_reason: string | null;
          assignment_status: string | null;
          contact_id: string | null;
          id: string | null;
          is_primary_assignee: boolean | null;
          notes: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contact_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'crm_contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_contact_id_fkey';
            columns: ['contact_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_contacts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contact_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_assignees_with_details: {
        Row: {
          assigned_at: string | null;
          assigned_to_user_id: string | null;
          assignee_email: string | null;
          assignee_name: string | null;
          assignee_picture: string | null;
          assignment_reason: string | null;
          assignment_status: string | null;
          id: string | null;
          is_primary_assignee: boolean | null;
          lead_id: string | null;
          notes: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'crm_leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_leads_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      lead_primary_assignees: {
        Row: {
          assigned_at: string | null;
          assigned_by: string | null;
          assigned_to_user_id: string | null;
          assignee_email: string | null;
          assignee_name: string | null;
          lead_id: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lead_assignees_assigned_by_fkey';
            columns: ['assigned_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'crm_leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_lead_id_fkey';
            columns: ['lead_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_leads_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lead_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      opportunity_assignees_with_details: {
        Row: {
          assigned_at: string | null;
          assigned_to_user_id: string | null;
          assignee_email: string | null;
          assignee_name: string | null;
          assignee_picture: string | null;
          assignment_reason: string | null;
          assignment_status: string | null;
          id: string | null;
          is_primary_assignee: boolean | null;
          notes: string | null;
          opportunity_id: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'opportunity_assignees_assigned_to_user_id_fkey';
            columns: ['assigned_to_user_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'crm_opportunities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_opportunity_id_fkey';
            columns: ['opportunity_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_opportunities_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'opportunity_assignees_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      vw_crm_accounts_list: {
        Row: {
          account_name: string | null;
          account_type: string | null;
          annual_revenue: number | null;
          billing_city: string | null;
          billing_country: string | null;
          billing_postal_code: string | null;
          billing_state: string | null;
          billing_street: string | null;
          company_size: string | null;
          created_at: string | null;
          created_by: string | null;
          created_by_account: Json | null;
          created_by_account_name: string | null;
          created_from_lead_id: string | null;
          employee_count: number | null;
          id: string | null;
          industry: Json | null;
          industry_id: string | null;
          industry_name: string | null;
          linkedin_url: string | null;
          owner: Json | null;
          owner_id: string | null;
          owner_name: string | null;
          phone_number: string | null;
          shipping_city: string | null;
          shipping_country: string | null;
          shipping_postal_code: string | null;
          shipping_state: string | null;
          shipping_street: string | null;
          status: Json | null;
          status_id: string | null;
          status_name: string | null;
          twitter_handle: string | null;
          updated_at: string | null;
          updated_by: string | null;
          updated_by_account: Json | null;
          updated_by_account_name: string | null;
          website: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_accounts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'crm_leads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_created_from_lead_id_fkey';
            columns: ['created_from_lead_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_leads_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_industry_id_fkey';
            columns: ['industry_id'];
            isOneToOne: false;
            referencedRelation: 'crm_industries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_accounts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entity_statuses_account_type_fkey';
            columns: ['account_type'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
        ];
      };
      vw_crm_contacts_list: {
        Row: {
          account: Json | null;
          account_id: string | null;
          account_name: string | null;
          alt_email: string | null;
          alt_phone: string | null;
          created_at: string | null;
          created_by: string | null;
          created_by_account: Json | null;
          created_by_account_name: string | null;
          department: string | null;
          do_not_call: boolean | null;
          do_not_email: boolean | null;
          email: string | null;
          first_name: string | null;
          id: string | null;
          job_title: string | null;
          language: string | null;
          last_name: string | null;
          linkedin_url: string | null;
          location: string | null;
          mobile_number: string | null;
          notes: string | null;
          owner: Json | null;
          owner_id: string | null;
          owner_name: string | null;
          phone_number: string | null;
          preferred_contact_method: string | null;
          status: Json | null;
          status_id: string | null;
          status_name: string | null;
          timezone: string | null;
          twitter_handle: string | null;
          updated_at: string | null;
          updated_by: string | null;
          updated_by_account: Json | null;
          updated_by_account_name: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_contacts_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'crm_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_accounts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_contacts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      vw_crm_leads_list: {
        Row: {
          alt_email: string | null;
          annual_revenue: number | null;
          company_name: string | null;
          company_size: Database['public']['Enums']['company_size'] | null;
          created_at: string | null;
          created_by: string | null;
          created_by_account: Json | null;
          created_by_account_name: string | null;
          department: string | null;
          email: string | null;
          first_name: string | null;
          id: string | null;
          industry: Json | null;
          industry_id: string | null;
          is_deleted: boolean | null;
          job_title: string | null;
          last_name: string | null;
          location: string | null;
          mobile_number: string | null;
          owner: Json | null;
          owner_id: string | null;
          phone_number: string | null;
          source: Json | null;
          source_id: string | null;
          status: Json | null;
          status_id: string | null;
          trigger: string | null;
          updated_at: string | null;
          updated_by_account: Json | null;
          updated_by_account_name: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_leads_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_industry_id_fkey';
            columns: ['industry_id'];
            isOneToOne: false;
            referencedRelation: 'crm_industries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'lead_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_leads_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      vw_crm_opportunities_list: {
        Row: {
          account: Json | null;
          account_id: string | null;
          account_name: string | null;
          amount: number | null;
          competitor: string | null;
          created_at: string | null;
          created_by: string | null;
          created_by_account: Json | null;
          created_by_account_name: string | null;
          currency: string | null;
          description: string | null;
          expected_close_date: string | null;
          id: string | null;
          is_closed: boolean | null;
          is_won: boolean | null;
          lead_source: string | null;
          opportunity_name: string | null;
          opportunity_type: string | null;
          owner: Json | null;
          owner_id: string | null;
          owner_name: string | null;
          primary_contact_id: string | null;
          priority: string | null;
          probability: number | null;
          stage: Json | null;
          stage_id: string | null;
          stage_name: string | null;
          updated_at: string | null;
          updated_by: string | null;
          updated_by_account: Json | null;
          updated_by_account_name: string | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'crm_opportunities_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'crm_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_accounts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_primary_contact_id_fkey';
            columns: ['primary_contact_id'];
            isOneToOne: false;
            referencedRelation: 'crm_contacts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_primary_contact_id_fkey';
            columns: ['primary_contact_id'];
            isOneToOne: false;
            referencedRelation: 'vw_crm_contacts_list';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_stage_id_fkey';
            columns: ['stage_id'];
            isOneToOne: false;
            referencedRelation: 'entity_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'crm_opportunities_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      apply_due_subscription_changes: {
        Args: { p_workspace_id?: string | null };
        Returns: number;
      };
      apply_free_forever_provisioning: {
        Args: { p_confirmation: string };
        Returns: Json;
      };
      apply_pricing_workspace_backfill: {
        Args: { p_confirmation: string };
        Returns: Json;
      };
      can_access_email_attachment_object: {
        Args: { p_object_name: string };
        Returns: boolean;
      };
      current_user_can_manage_workspace_subscription: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      current_user_can_send_from_email_account: {
        Args: { p_email_account_id: number };
        Returns: boolean;
      };
      current_user_can_view_workspace_subscription: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      current_user_is_workspace_admin: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      current_user_is_workspace_billing_owner: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      current_user_is_workspace_member: {
        Args: { p_workspace_id: string };
        Returns: boolean;
      };
      expire_due_subscription_trials: {
        Args: Record<PropertyKey, never>;
        Returns: { workspace_id: string }[];
      };
      gbt_bit_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_bool_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_bool_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_bpchar_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_bytea_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_cash_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_cash_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_date_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_date_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_decompress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_enum_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_enum_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_float4_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_float4_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_float8_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_float8_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_inet_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_int2_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_int2_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_int4_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_int4_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_int8_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_int8_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_intv_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_intv_decompress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_intv_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_macad_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_macad_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_macad8_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_macad8_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_numeric_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_oid_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_oid_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_text_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_time_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_time_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_timetz_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_ts_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_ts_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_tstz_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_uuid_compress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_uuid_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_var_decompress: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbt_var_fetch: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey_var_in: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey_var_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey16_in: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey16_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey2_in: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey2_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey32_in: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey32_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey4_in: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey4_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey8_in: {
        Args: { '': unknown };
        Returns: unknown;
      };
      gbtreekey8_out: {
        Args: { '': unknown };
        Returns: unknown;
      };
      get_core_documents: {
        Args: {
          p_created_at_from?: string;
          p_created_at_to?: string;
          p_created_by_ids?: string[];
          p_entity_id?: string;
          p_entity_type?: string;
          p_is_workspace_owner?: boolean;
          p_limit?: number;
          p_page?: number;
          p_search_term?: string;
          p_type?: string;
          p_updated_at_from?: string;
          p_updated_at_to?: string;
          p_user_id?: string;
          p_workspace_id: string;
        };
        Returns: Json;
      };
      get_core_meetings: {
        Args: {
          p_created_at_from?: string;
          p_created_at_to?: string;
          p_created_by_ids?: string[];
          p_entity_id?: string;
          p_entity_type?: string;
          p_is_workspace_owner?: boolean;
          p_limit?: number;
          p_page?: number;
          p_search_term?: string;
          p_statuses?: string[];
          p_timeframe?: string;
          p_updated_at_from?: string;
          p_updated_at_to?: string;
          p_user_id?: string;
          p_workspace_id: string;
        };
        Returns: Json;
      };
      get_core_notes: {
        Args: {
          p_created_at_from?: string;
          p_created_at_to?: string;
          p_created_by_ids?: string[];
          p_entity_id?: string;
          p_entity_type?: string;
          p_is_workspace_owner?: boolean;
          p_limit?: number;
          p_page?: number;
          p_search_term?: string;
          p_status?: string;
          p_updated_at_from?: string;
          p_updated_at_to?: string;
          p_user_id?: string;
          p_workspace_id: string;
        };
        Returns: Json;
      };
      get_core_reminders: {
        Args: {
          p_created_at_from?: string;
          p_created_at_to?: string;
          p_created_by_ids?: string[];
          p_entity_id?: string;
          p_entity_type?: string;
          p_is_workspace_owner?: boolean;
          p_limit?: number;
          p_page?: number;
          p_priority?: string;
          p_search_term?: string;
          p_status?: string;
          p_updated_at_from?: string;
          p_updated_at_to?: string;
          p_user_id?: string;
          p_workspace_id: string;
        };
        Returns: Json;
      };
      get_effective_plan_entitlement: {
        Args: { p_feature_id: string; p_plan_id: string };
        Returns: {
          enum_value: string;
          is_enabled: boolean;
          limit_type: string;
          limit_value: number;
          resolved_from_plan_key: string;
        }[];
      };
      get_free_forever_provisioning_targets: {
        Args: Record<PropertyKey, never>;
        Returns: {
          workspace_id: string;
          workspace_name: string;
        }[];
      };
      get_legacy_paid_launch_targets: {
        Args: Record<PropertyKey, never>;
        Returns: {
          active_seat_assignments: number;
          current_plan_key: string;
          legacy_status: Database['public']['Enums']['seat_subscription_status'];
          module_id: string;
          module_key: string;
          paid_seats: number;
          recommended_action: string;
          target_billing_cycle: Database['public']['Enums']['billing_cycle'];
          workspace_id: string;
          workspace_name: string;
        }[];
      };
      get_lead_related_entities: {
        Args: { p_lead_id: string; p_workspace_id: string };
        Returns: Json;
      };
      get_pricing_backfill_feature_usage: {
        Args: { p_feature_key: string; p_workspace_id: string };
        Returns: number;
      };
      get_pricing_workspace_backfill_targets: {
        Args: Record<PropertyKey, never>;
        Returns: {
          active_seat_assignments: number;
          assignment_reason: string;
          blocking_issue: string;
          existing_plan_key: string;
          module_id: string;
          module_key: string;
          paid_seats: number;
          recommended_action: string;
          target_billing_cycle: Database['public']['Enums']['billing_cycle'];
          target_plan_id: string;
          target_plan_key: string;
          unsupported_entitlement_types: string[];
          valid_internal_partner_entitlements: number;
          workspace_id: string;
          workspace_name: string;
        }[];
      };
      reconcile_subscription_usage: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_sales_dashboard_stats: {
        Args:
          | {
              p_date_from?: string;
              p_date_to?: string;
              p_is_all_visible?: boolean;
              p_user_id?: string;
              p_visible_user_ids?: string[];
              p_workspace_id: string;
            }
          | {
              p_is_all_visible?: boolean;
              p_user_id?: string;
              p_visible_user_ids?: string[];
              p_workspace_id: string;
            };
        Returns: Json;
      };
      get_service_cloud_dashboard_stats: {
        Args:
          | { p_date_from?: string; p_date_to?: string; p_workspace_id: string }
          | { p_workspace_id: string };
        Returns: Json;
      };
      get_workspace_entitlement_context: {
        Args: { p_module_key: string; p_workspace_id: string };
        Returns: Json;
      };
      initialize_workspace_crm_data: {
        Args: { p_workspace_id: string };
        Returns: undefined;
      };
      initialize_workspace_session: {
        Args: {
          p_user_email?: string;
          p_user_id: string;
          p_workspace_id?: string;
        };
        Returns: Json;
      };
      migrate_legacy_paid_seats_to_launch: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      preview_pricing_workspace_backfill: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      provision_workspace_free_forever: {
        Args: { p_workspace_id: string };
        Returns: Json;
      };
      release_entitlement: {
        Args: {
          p_feature_id: string;
          p_quantity?: number;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      resolve_workspace_access: {
        Args: {
          p_require_shared_team?: boolean;
          p_user_email?: string;
          p_user_id: string;
          p_workspace_id: string;
        };
        Returns: Json;
      };
      try_consume_entitlement: {
        Args: {
          p_feature_id: string;
          p_quantity?: number;
          p_workspace_id: string;
        };
        Returns: Json;
      };
      user_has_product_access: {
        Args: {
          p_product_key: string;
          p_user_id: string;
          p_workspace_id: string;
        };
        Returns: boolean;
      };
      validate_pricing_workspace_backfill: {
        Args: Record<PropertyKey, never>;
        Returns: {
          details: Json;
          issue_code: string;
          module_key: string;
          severity: string;
          workspace_id: string;
        }[];
      };
    };
    Enums: {
      billing_cycle: 'monthly' | 'yearly';
      company_size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
      crm_feature_type:
        | 'crud'
        | 'action'
        | 'view'
        | 'export'
        | 'import'
        | 'bulk';
      email_account_access_scope: 'private' | 'workspace';
      email_provider: 'google' | 'outlook' | 'smtp';
      entitlement_type:
        | 'free_internal'
        | 'partner'
        | 'close_customer'
        | 'trial'
        | 'promo';
      invitation_status:
        | 'pending'
        | 'accepted'
        | 'expired'
        | 'declined'
        | 'revoked';
      payment_provider: 'stripe' | 'razorpay' | 'manual';
      permission_access_level: 'none' | 'own' | 'team' | 'all';
      seat_subscription_status:
        | 'active'
        | 'trialing'
        | 'past_due'
        | 'cancelled'
        | 'expired';
      workspace_member_status: 'pending' | 'accepted' | 'inactive' | 'removed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  service_cloud: {
    Tables: {
      customers: {
        Row: {
          created_at: string;
          created_by: string | null;
          custom_fields: Json;
          deleted_at: string | null;
          deleted_by: string | null;
          email: string | null;
          external_reference: string | null;
          id: string;
          is_deleted: boolean;
          job_title: string | null;
          locale: string | null;
          name: string;
          organization_id: string | null;
          phone: string | null;
          tags: Json;
          timezone: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          custom_fields?: Json;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string | null;
          external_reference?: string | null;
          id?: string;
          is_deleted?: boolean;
          job_title?: string | null;
          locale?: string | null;
          name: string;
          organization_id?: string | null;
          phone?: string | null;
          tags?: Json;
          timezone?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          custom_fields?: Json;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string | null;
          external_reference?: string | null;
          id?: string;
          is_deleted?: boolean;
          job_title?: string | null;
          locale?: string | null;
          name?: string;
          organization_id?: string | null;
          phone?: string | null;
          tags?: Json;
          timezone?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_events: {
        Row: {
          activity_id: string | null;
          channel: Database['service_cloud']['Enums']['notification_channel_enum'];
          created_at: string;
          event_type: Database['service_cloud']['Enums']['activity_event_enum'];
          id: string;
          is_sent: boolean;
          payload: Json;
          recipient_account_id: string | null;
          sent_at: string | null;
          ticket_id: string | null;
          workspace_id: string;
        };
        Insert: {
          activity_id?: string | null;
          channel: Database['service_cloud']['Enums']['notification_channel_enum'];
          created_at?: string;
          event_type: Database['service_cloud']['Enums']['activity_event_enum'];
          id?: string;
          is_sent?: boolean;
          payload?: Json;
          recipient_account_id?: string | null;
          sent_at?: string | null;
          ticket_id?: string | null;
          workspace_id: string;
        };
        Update: {
          activity_id?: string | null;
          channel?: Database['service_cloud']['Enums']['notification_channel_enum'];
          created_at?: string;
          event_type?: Database['service_cloud']['Enums']['activity_event_enum'];
          id?: string;
          is_sent?: boolean;
          payload?: Json;
          recipient_account_id?: string | null;
          sent_at?: string | null;
          ticket_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_events_activity_id_fkey';
            columns: ['activity_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_activities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_events_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_time_summary';
            referencedColumns: ['ticket_id'];
          },
          {
            foreignKeyName: 'notification_events_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_preferences: {
        Row: {
          account_id: string;
          channel: Database['service_cloud']['Enums']['notification_channel_enum'];
          created_at: string;
          event_type: Database['service_cloud']['Enums']['activity_event_enum'];
          id: string;
          is_enabled: boolean;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          account_id: string;
          channel: Database['service_cloud']['Enums']['notification_channel_enum'];
          created_at?: string;
          event_type: Database['service_cloud']['Enums']['activity_event_enum'];
          id?: string;
          is_enabled?: boolean;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          account_id?: string;
          channel?: Database['service_cloud']['Enums']['notification_channel_enum'];
          created_at?: string;
          event_type?: Database['service_cloud']['Enums']['activity_event_enum'];
          id?: string;
          is_enabled?: boolean;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          address_line_1: string | null;
          address_line_2: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          created_by: string | null;
          custom_fields: Json;
          deleted_at: string | null;
          deleted_by: string | null;
          email: string | null;
          id: string;
          industry: string | null;
          is_deleted: boolean;
          name: string;
          owner_id: string | null;
          phone: string | null;
          postal_code: string | null;
          state: string | null;
          tags: Json;
          updated_at: string;
          updated_by: string | null;
          website: string | null;
          workspace_id: string;
        };
        Insert: {
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_fields?: Json;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string | null;
          id?: string;
          industry?: string | null;
          is_deleted?: boolean;
          name: string;
          owner_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          tags?: Json;
          updated_at?: string;
          updated_by?: string | null;
          website?: string | null;
          workspace_id: string;
        };
        Update: {
          address_line_1?: string | null;
          address_line_2?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_fields?: Json;
          deleted_at?: string | null;
          deleted_by?: string | null;
          email?: string | null;
          id?: string;
          industry?: string | null;
          is_deleted?: boolean;
          name?: string;
          owner_id?: string | null;
          phone?: string | null;
          postal_code?: string | null;
          state?: string | null;
          tags?: Json;
          updated_at?: string;
          updated_by?: string | null;
          website?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          account_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_team_lead: boolean;
          joined_at: string;
          team_id: string;
          workspace_id: string;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_team_lead?: boolean;
          joined_at?: string;
          team_id: string;
          workspace_id: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_team_lead?: boolean;
          joined_at?: string;
          team_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'team_members_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          email_alias: string | null;
          id: string;
          is_active: boolean;
          is_default: boolean;
          manager_id: string | null;
          name: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          email_alias?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          manager_id?: string | null;
          name: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          email_alias?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          manager_id?: string | null;
          name?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      ticket_activities: {
        Row: {
          actor_account_id: string | null;
          actor_customer_id: string | null;
          created_at: string;
          event_type: Database['service_cloud']['Enums']['activity_event_enum'];
          from_value: Json | null;
          id: string;
          metadata: Json;
          summary: string | null;
          ticket_id: string;
          to_value: Json | null;
          workspace_id: string;
        };
        Insert: {
          actor_account_id?: string | null;
          actor_customer_id?: string | null;
          created_at?: string;
          event_type: Database['service_cloud']['Enums']['activity_event_enum'];
          from_value?: Json | null;
          id?: string;
          metadata?: Json;
          summary?: string | null;
          ticket_id: string;
          to_value?: Json | null;
          workspace_id: string;
        };
        Update: {
          actor_account_id?: string | null;
          actor_customer_id?: string | null;
          created_at?: string;
          event_type?: Database['service_cloud']['Enums']['activity_event_enum'];
          from_value?: Json | null;
          id?: string;
          metadata?: Json;
          summary?: string | null;
          ticket_id?: string;
          to_value?: Json | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_activities_actor_customer_id_fkey';
            columns: ['actor_customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_activities_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_time_summary';
            referencedColumns: ['ticket_id'];
          },
          {
            foreignKeyName: 'ticket_activities_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_assignees: {
        Row: {
          account_id: string;
          assignment_role: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_primary: boolean;
          ticket_id: string;
          workspace_id: string;
        };
        Insert: {
          account_id: string;
          assignment_role?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_primary?: boolean;
          ticket_id: string;
          workspace_id: string;
        };
        Update: {
          account_id?: string;
          assignment_role?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_primary?: boolean;
          ticket_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_assignees_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_time_summary';
            referencedColumns: ['ticket_id'];
          },
          {
            foreignKeyName: 'ticket_assignees_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_categories: {
        Row: {
          category_key: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          is_system: boolean;
          name: string;
          parent_category_id: string | null;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          category_key: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          name: string;
          parent_category_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          category_key?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          is_system?: boolean;
          name?: string;
          parent_category_id?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_categories_parent_category_id_fkey';
            columns: ['parent_category_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_email_threads: {
        Row: {
          created_at: string;
          created_by: string | null;
          email_account_id: number | null;
          id: string;
          thread_key: string;
          ticket_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          email_account_id?: number | null;
          id?: string;
          thread_key: string;
          ticket_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          email_account_id?: number | null;
          id?: string;
          thread_key?: string;
          ticket_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_email_threads_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_time_summary';
            referencedColumns: ['ticket_id'];
          },
          {
            foreignKeyName: 'ticket_email_threads_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_emails: {
        Row: {
          account_id: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          email_id: string;
          email_role: string;
          id: string;
          is_public: boolean;
          ticket_id: string;
          workspace_id: string;
        };
        Insert: {
          account_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          email_id: string;
          email_role?: string;
          id?: string;
          is_public?: boolean;
          ticket_id: string;
          workspace_id: string;
        };
        Update: {
          account_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          email_id?: string;
          email_role?: string;
          id?: string;
          is_public?: boolean;
          ticket_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_emails_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_emails_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_time_summary';
            referencedColumns: ['ticket_id'];
          },
          {
            foreignKeyName: 'ticket_emails_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_priorities: {
        Row: {
          color: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          is_default: boolean;
          is_system: boolean;
          name: string;
          priority_key: string;
          resolution_due_minutes: number | null;
          response_due_minutes: number | null;
          severity_order: number;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          is_system?: boolean;
          name: string;
          priority_key: string;
          resolution_due_minutes?: number | null;
          response_due_minutes?: number | null;
          severity_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          is_system?: boolean;
          name?: string;
          priority_key?: string;
          resolution_due_minutes?: number | null;
          response_due_minutes?: number | null;
          severity_order?: number;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      ticket_sequences: {
        Row: {
          last_number: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          last_number?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          last_number?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [];
      };
      ticket_status_durations: {
        Row: {
          changed_by: string | null;
          created_at: string;
          duration_seconds: number | null;
          ended_at: string | null;
          id: string;
          started_at: string;
          status_id: string;
          ticket_id: string;
          workspace_id: string;
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          status_id: string;
          ticket_id: string;
          workspace_id: string;
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          status_id?: string;
          ticket_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_status_durations_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_status_durations_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_time_summary';
            referencedColumns: ['ticket_id'];
          },
          {
            foreignKeyName: 'ticket_status_durations_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_statuses: {
        Row: {
          color: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          display_order: number;
          id: string;
          is_active: boolean;
          is_default: boolean;
          is_system: boolean;
          lifecycle: Database['service_cloud']['Enums']['ticket_lifecycle_enum'];
          name: string;
          status_key: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          is_system?: boolean;
          lifecycle?: Database['service_cloud']['Enums']['ticket_lifecycle_enum'];
          name: string;
          status_key: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          is_system?: boolean;
          lifecycle?: Database['service_cloud']['Enums']['ticket_lifecycle_enum'];
          name?: string;
          status_key?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [];
      };
      tickets: {
        Row: {
          assigned_agent_id: string | null;
          assigned_team_id: string | null;
          category_id: string | null;
          closed_at: string | null;
          closed_by: string | null;
          created_at: string;
          created_by: string | null;
          custom_fields: Json;
          customer_id: string | null;
          deleted_at: string | null;
          deleted_by: string | null;
          description: string | null;
          due_at: string | null;
          due_date: string | null;
          email_count: number;
          first_response_at: string | null;
          id: string;
          is_deleted: boolean;
          last_agent_response_at: string | null;
          last_customer_response_at: string | null;
          organization_id: string | null;
          priority_id: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          response_due_at: string | null;
          source: Database['service_cloud']['Enums']['ticket_source_enum'];
          status_id: string;
          subject: string;
          support_email_account_id: number | null;
          tags: Json;
          ticket_number: number;
          total_logged_seconds: number;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          assigned_agent_id?: string | null;
          assigned_team_id?: string | null;
          category_id?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_fields?: Json;
          customer_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          due_date?: string | null;
          email_count?: number;
          first_response_at?: string | null;
          id?: string;
          is_deleted?: boolean;
          last_agent_response_at?: string | null;
          last_customer_response_at?: string | null;
          organization_id?: string | null;
          priority_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          response_due_at?: string | null;
          source?: Database['service_cloud']['Enums']['ticket_source_enum'];
          status_id: string;
          subject: string;
          support_email_account_id?: number | null;
          tags?: Json;
          ticket_number: number;
          total_logged_seconds?: number;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          assigned_agent_id?: string | null;
          assigned_team_id?: string | null;
          category_id?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          custom_fields?: Json;
          customer_id?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          description?: string | null;
          due_at?: string | null;
          due_date?: string | null;
          email_count?: number;
          first_response_at?: string | null;
          id?: string;
          is_deleted?: boolean;
          last_agent_response_at?: string | null;
          last_customer_response_at?: string | null;
          organization_id?: string | null;
          priority_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          response_due_at?: string | null;
          source?: Database['service_cloud']['Enums']['ticket_source_enum'];
          status_id?: string;
          subject?: string;
          support_email_account_id?: number | null;
          tags?: Json;
          ticket_number?: number;
          total_logged_seconds?: number;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tickets_assigned_team_id_fkey';
            columns: ['assigned_team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_priority_id_fkey';
            columns: ['priority_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_priorities';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_statuses';
            referencedColumns: ['id'];
          },
        ];
      };
      time_entries: {
        Row: {
          account_id: string;
          activities: string | null;
          billable: boolean;
          created_at: string;
          created_by: string | null;
          description: string | null;
          duration_seconds: number;
          end_time: string | null;
          id: string;
          logged_date: string;
          start_time: string | null;
          team_id: string | null;
          ticket_id: string;
          updated_at: string;
          updated_by: string | null;
          workspace_id: string;
        };
        Insert: {
          account_id: string;
          activities?: string | null;
          billable?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_seconds: number;
          end_time?: string | null;
          id?: string;
          logged_date?: string;
          start_time?: string | null;
          team_id?: string | null;
          ticket_id: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id: string;
        };
        Update: {
          account_id?: string;
          activities?: string | null;
          billable?: boolean;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          duration_seconds?: number;
          end_time?: string | null;
          id?: string;
          logged_date?: string;
          start_time?: string | null;
          team_id?: string | null;
          ticket_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'time_entries_team_id_fkey';
            columns: ['team_id'];
            isOneToOne: false;
            referencedRelation: 'teams';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_entries_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_time_summary';
            referencedColumns: ['ticket_id'];
          },
          {
            foreignKeyName: 'time_entries_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      ticket_status_duration_summary: {
        Row: {
          lifecycle:
            | Database['service_cloud']['Enums']['ticket_lifecycle_enum']
            | null;
          status_id: string | null;
          status_name: string | null;
          ticket_id: string | null;
          total_seconds: number | null;
          transition_count: number | null;
          workspace_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_status_durations_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_statuses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_status_durations_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'ticket_time_summary';
            referencedColumns: ['ticket_id'];
          },
          {
            foreignKeyName: 'ticket_status_durations_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_time_summary: {
        Row: {
          latest_time_entry_at: string | null;
          subject: string | null;
          ticket_id: string | null;
          ticket_number: number | null;
          time_entry_count: number | null;
          total_logged_seconds: number | null;
          workspace_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      account_display_name: {
        Args: { p_account_id: string };
        Returns: string;
      };
      core_email_matches_thread: {
        Args: {
          p_email_references: string;
          p_email_thread_key: string;
          p_in_reply_to: string;
          p_ticket_thread_key: string;
        };
        Returns: boolean;
      };
      core_email_thread_keys: {
        Args: {
          p_email_references: string;
          p_internet_message_id: string;
          p_thread_key: string;
        };
        Returns: {
          thread_key: string;
        }[];
      };
      core_email_ticket_role: {
        Args: { p_direction: string };
        Returns: string;
      };
      initialize_workspace_data: {
        Args: { p_workspace_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      activity_event_enum:
        | 'ticket_created'
        | 'ticket_updated'
        | 'ticket_assigned'
        | 'ticket_reassigned'
        | 'status_changed'
        | 'priority_changed'
        | 'category_changed'
        | 'customer_replied'
        | 'agent_replied'
        | 'internal_note_added'
        | 'email_linked'
        | 'document_linked'
        | 'time_logged'
        | 'ticket_resolved'
        | 'ticket_closed'
        | 'ticket_reopened'
        | 'system_event';
      notification_channel_enum: 'in_app' | 'email';
      ticket_lifecycle_enum:
        | 'new'
        | 'open'
        | 'in_progress'
        | 'waiting'
        | 'resolved'
        | 'closed';
      ticket_source_enum:
        | 'email'
        | 'manual'
        | 'portal'
        | 'phone'
        | 'chat'
        | 'api';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  core: {
    Enums: {
      email_account_access_scope_enum: ['private', 'workspace'],
      email_direction_enum: ['inbound', 'outbound', 'internal', 'system'],
      email_provider_enum: ['google', 'outlook', 'smtp', 'imap'],
      email_status_enum: [
        'draft',
        'scheduled',
        'queued',
        'sent',
        'failed',
        'received',
      ],
    },
  },
  hrms: {
    Enums: {
      announcement_category: ['general', 'policy', 'payroll', 'event'],
      announcement_status: ['draft', 'published', 'archived'],
      asset_clearance_status: ['PENDING', 'RETURNED', 'WAIVED'],
      asset_return_condition: ['PENDING', 'GOOD', 'DAMAGED', 'LOST'],
      attendance_punch_type: ['in', 'out'],
      attendance_record_status: ['present', 'absent'],
      compensation_assignment_status: [
        'draft',
        'active',
        'closed',
        'cancelled',
      ],
      compensation_assignment_type: [
        'primary',
        'secondary',
        'contract',
        'retainer',
      ],
      document_status: ['valid', 'invalid', 'pending', 'expired_soon'],
      employee_employment_type: [
        'full_time',
        'part_time',
        'contract',
        'intern',
      ],
      employee_status: [
        'invited',
        'active',
        'probation',
        'notice_period',
        'inactive',
        'exited',
      ],
      exit_letter_status: ['DRAFT', 'ISSUED', 'CANCELLED'],
      exit_letter_type: ['RELIEVING', 'EXPERIENCE'],
      exit_task_category: ['IT', 'ADMIN', 'HR', 'FINANCE'],
      fnf_settlement_status: [
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'PAID',
        'REJECTED',
      ],
      hr_request_category: [
        'payroll',
        'policy',
        'personal_details',
        'documents',
        'benefits',
        'other',
      ],
      hr_request_priority: ['low', 'medium', 'high', 'urgent'],
      hr_request_status: ['open', 'in_progress', 'resolved', 'closed'],
      leave_request_status: ['pending', 'approved', 'rejected', 'cancelled'],
      pay_frequency: ['monthly', 'hourly', 'daily', 'one_time'],
      pay_item_source_type: [
        'manual',
        'bonus',
        'incentive',
        'reimbursement',
        'arrear',
        'adjustment',
        'attendance',
        'statutory',
      ],
      pay_item_status: ['draft', 'approved', 'cancelled', 'applied'],
      payroll_entry_status: [
        'draft',
        'calculated',
        'approved',
        'paid',
        'cancelled',
      ],
      payroll_item_source: [
        'assignment',
        'pay_item',
        'attendance',
        'statutory',
        'manual',
        'arrear',
      ],
      payroll_run_status: [
        'draft',
        'calculating',
        'processed',
        'approved',
        'paid',
        'cancelled',
      ],
      payslip_status: ['generated', 'published', 'void'],
      recruitment_candidate_status: [
        'sourced',
        'applied',
        'screening',
        'interview',
        'shortlisted',
        'offered',
        'hired',
        'rejected',
        'withdrawn',
      ],
      recruitment_employment_type: [
        'full_time',
        'part_time',
        'contract',
        'intern',
      ],
      recruitment_feedback_recommendation: ['strong_yes', 'yes', 'maybe', 'no'],
      recruitment_interview_round_type: [
        'screening',
        'technical',
        'managerial',
        'panel',
        'hr',
      ],
      recruitment_interview_status: [
        'scheduled',
        'completed',
        'cancelled',
        'no_show',
      ],
      recruitment_offer_status: [
        'draft',
        'approval_pending',
        'sent',
        'accepted',
        'declined',
        'expired',
      ],
      recruitment_onboarding_status: [
        'pending',
        'in_progress',
        'completed',
        'blocked',
      ],
      recruitment_priority: ['low', 'medium', 'high', 'urgent'],
      recruitment_requisition_status: [
        'draft',
        'open',
        'on_hold',
        'filled',
        'closed',
        'cancelled',
      ],
      resignation_status: [
        'SUBMITTED',
        'UNDER_REVIEW',
        'ACCEPTED',
        'RETRACTED',
      ],
      salary_calculation_type: [
        'fixed_amount',
        'percentage_of_ctc',
        'percentage_of_basic',
        'percentage_of_gross',
        'formula',
      ],
      salary_component_type: ['earning', 'deduction', 'employer_contribution'],
    },
  },
  public: {
    Enums: {
      billing_cycle: ['monthly', 'yearly'],
      company_size: ['startup', 'small', 'medium', 'large', 'enterprise'],
      crm_feature_type: ['crud', 'action', 'view', 'export', 'import', 'bulk'],
      email_account_access_scope: ['private', 'workspace'],
      email_provider: ['google', 'outlook', 'smtp'],
      entitlement_type: [
        'free_internal',
        'partner',
        'close_customer',
        'trial',
        'promo',
      ],
      invitation_status: [
        'pending',
        'accepted',
        'expired',
        'declined',
        'revoked',
      ],
      payment_provider: ['stripe', 'razorpay', 'manual'],
      permission_access_level: ['none', 'own', 'team', 'all'],
      seat_subscription_status: [
        'active',
        'trialing',
        'past_due',
        'cancelled',
        'expired',
      ],
      workspace_member_status: ['pending', 'accepted', 'inactive', 'removed'],
    },
  },
  service_cloud: {
    Enums: {
      activity_event_enum: [
        'ticket_created',
        'ticket_updated',
        'ticket_assigned',
        'ticket_reassigned',
        'status_changed',
        'priority_changed',
        'category_changed',
        'customer_replied',
        'agent_replied',
        'internal_note_added',
        'email_linked',
        'document_linked',
        'time_logged',
        'ticket_resolved',
        'ticket_closed',
        'ticket_reopened',
        'system_event',
      ],
      notification_channel_enum: ['in_app', 'email'],
      ticket_lifecycle_enum: [
        'new',
        'open',
        'in_progress',
        'waiting',
        'resolved',
        'closed',
      ],
      ticket_source_enum: ['email', 'manual', 'portal', 'phone', 'chat', 'api'],
    },
  },
} as const;

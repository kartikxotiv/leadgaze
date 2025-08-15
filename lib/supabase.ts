import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-supabase-project-url' && 
  supabaseAnonKey !== 'your-supabase-anonymous-key' &&
  supabaseUrl.startsWith('https://');

// Create a dummy client for build-time or when Supabase is not configured
const createDummyClient = () => {
  return {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      upsert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
    }),
  } as any;
};

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createDummyClient();

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          company_name: string
          contact_person: string
          email: string | null
          phone: string | null
          alt_email: string | null
          alt_phone: string | null
          website: string | null
          linkedin_company: string | null
          linkedin_profile: string | null
          status: string
          type: string
          source: string
          deal_value: number
          industry: string | null
          priority: string
          notes: string | null
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_person: string
          email?: string | null
          phone?: string | null
          alt_email?: string | null
          alt_phone?: string | null
          website?: string | null
          linkedin_company?: string | null
          linkedin_profile?: string | null
          status?: string
          type?: string
          source: string
          deal_value?: number
          industry?: string | null
          priority?: string
          notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_person?: string
          email?: string | null
          phone?: string | null
          alt_email?: string | null
          alt_phone?: string | null
          website?: string | null
          linkedin_company?: string | null
          linkedin_profile?: string | null
          status?: string
          type?: string
          source?: string
          deal_value?: number
          industry?: string | null
          priority?: string
          notes?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          type: string
          priority: string
          status: string
          due_date: string | null
          completed: boolean
          lead_id: string | null
          assigned_to: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          type?: string
          priority?: string
          status?: string
          due_date?: string | null
          completed?: boolean
          lead_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          type?: string
          priority?: string
          status?: string
          due_date?: string | null
          completed?: boolean
          lead_id?: string | null
          assigned_to?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pipeline_stages: {
        Row: {
          id: string
          name: string
          position: number
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          position: number
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          color?: string
          created_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          lead_id: string | null
          stage_id: string | null
          value: number
          probability: number
          expected_close_date: string | null
          notes: string | null
          assigned_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          stage_id?: string | null
          value?: number
          probability?: number
          expected_close_date?: string | null
          notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          stage_id?: string | null
          value?: number
          probability?: number
          expected_close_date?: string | null
          notes?: string | null
          assigned_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          lead_id: string | null
          user_id: string | null
          activity_type: string
          description: string
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          user_id?: string | null
          activity_type: string
          description: string
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          user_id?: string | null
          activity_type?: string
          description?: string
          metadata?: any | null
          created_at?: string
        }
      }
    }
  }
}

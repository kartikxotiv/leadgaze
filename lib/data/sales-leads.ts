import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";
import {
  buildSearchQuery,
  buildWhereFilters,
  paginateQuery,
  type PaginationResult,
} from "../utils/supabase-queries";

export type SalesLead = Database["public"]["Tables"]["sales_leads"]["Row"];
export type SalesLeadInsert = Database["public"]["Tables"]["sales_leads"]["Insert"];
export type SalesLeadUpdate = Database["public"]["Tables"]["sales_leads"]["Update"];

type SalesContactSummary = Pick<
  Database["public"]["Tables"]["sales_contacts"]["Row"],
  "id" | "first_name" | "last_name" | "email" | "phone_number"
>;

type LeadPrioritySummary = Pick<
  Database["public"]["Tables"]["lead_priorities"]["Row"],
  "id" | "name" | "color"
>;

type ContactPlatformSummary = Pick<
  Database["public"]["Tables"]["contact_platforms"]["Row"],
  "id" | "name"
>;

type UserSummary = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export type SalesLeadWithRelations = SalesLead & {
  contact?: SalesContactSummary | null;
  owner?: UserSummary | null;
  created_by_user?: UserSummary | null;
  priority_config?: LeadPrioritySummary | null;
  platform_config?: ContactPlatformSummary | null;
};

export async function getSalesLeads(): Promise<SalesLead[]> {
  const { data, error } = await supabase
    .from("sales_leads")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getSalesLeadById(leadId: string): Promise<SalesLead | null> {
  const { data, error } = await supabase
    .from("sales_leads")
    .select("*")
    .eq("id", leadId)
    .eq("is_deleted", false)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function getSalesLeadWithRelations(
  leadId: string
): Promise<SalesLeadWithRelations | null> {
  const { data, error } = await supabase
    .from("sales_leads")
    .select(
      `
        *,
        contact:sales_contacts!sales_leads_contact_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone_number
        ),
        owner:users!sales_leads_owner_id_fkey (
          user_id,
          first_name,
          last_name,
          email
        ),
        created_by_user:users!sales_leads_created_by_fkey (
          user_id,
          first_name,
          last_name,
          email
        ),
        priority_config:lead_priorities!sales_leads_priority_fkey (
          id,
          name,
          color
        ),
        platform_config:contact_platforms!sales_leads_platform_fkey (
          id,
          name
        )
      `
    )
    .eq("id", leadId)
    .eq("is_deleted", false)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as SalesLeadWithRelations) ?? null;
}

export async function getSalesLeadsPaginated(
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<SalesLead>> {
  const effectiveFilters = {
    is_deleted: false,
    ...(filters ?? {}),
  };

  let query = supabase.from("sales_leads").select("*");

  if (effectiveFilters) {
    query = buildWhereFilters(query, effectiveFilters);
  }

  if (search) {
    query = buildSearchQuery(query, search, [
      "first_name",
      "last_name",
      "email",
      "location",
      "contact_time_zone",
    ]);
  }

  query = query.order("created_at", { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createSalesLead(input: SalesLeadInsert): Promise<SalesLead> {
  const payload: SalesLeadInsert = {
    ...input,
    is_deleted: input.is_deleted ?? false,
  };

  const { data, error } = await supabase
    .from("sales_leads")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as SalesLead;
}

export async function updateSalesLead(
  leadId: string,
  updates: SalesLeadUpdate
): Promise<SalesLead> {
  const { data, error } = await supabase
    .from("sales_leads")
    .update({
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) throw error;
  return data as SalesLead;
}

export async function deleteSalesLead(leadId: string): Promise<boolean> {
  const { error } = await supabase
    .from("sales_leads")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) throw error;
  return true;
}

import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";
import {
  buildSearchQuery,
  buildWhereFilters,
  paginateQuery,
  type PaginationResult,
} from "../utils/supabase-queries";

export type Account = {
  id: string;
  sales_lead_id: string;
  business_id: string | null;
  workspace_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone_number: number | null;
  alternative_email: string | null;
  alternative_phone_number: string | null;
  linkedin_url: string | null;
  location: string | null;
  contact_time_zone: string | null;
  business_name: string | null;
  business_linkedin: string | null;
  business_contact: string | null;
  platform: number | null;
  priority: string | null;
  comment: string | null;
  owner_id: string | null;
  created_by: string | null;
  converted_at: string;
  converted_from_lead_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountInsert = {
  id?: string;
  sales_lead_id: string;
  business_id?: string | null;
  workspace_id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone_number?: number | null;
  alternative_email?: string | null;
  alternative_phone_number?: string | null;
  linkedin_url?: string | null;
  location?: string | null;
  contact_time_zone?: string | null;
  business_name?: string | null;
  business_linkedin?: string | null;
  business_contact?: string | null;
  platform?: number | null;
  priority?: string | null;
  comment?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
  converted_at?: string;
  converted_from_lead_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AccountUpdate = {
  id?: string;
  sales_lead_id?: string;
  business_id?: string | null;
  workspace_id?: string;
  first_name?: string;
  last_name?: string | null;
  email?: string | null;
  phone_number?: number | null;
  alternative_email?: string | null;
  alternative_phone_number?: string | null;
  linkedin_url?: string | null;
  location?: string | null;
  contact_time_zone?: string | null;
  business_name?: string | null;
  business_linkedin?: string | null;
  business_contact?: string | null;
  platform?: number | null;
  priority?: string | null;
  comment?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
  converted_at?: string;
  converted_from_lead_at?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("is_deleted", false)
    .order("converted_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAccountById(
  accountId: string
): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("is_deleted", false)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function getAccountsPaginated(
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<Account>> {
  let effectiveFilters: Record<string, any> = {
    is_deleted: false,
    ...(filters ?? {}),
  };

  let query = supabase.from("accounts").select("*", { count: "exact" });

  if (effectiveFilters && Object.keys(effectiveFilters).length > 0) {
    query = buildWhereFilters(query, effectiveFilters);
  }

  if (search) {
    query = buildSearchQuery(query, search, [
      "first_name",
      "last_name",
      "email",
      "location",
      "business_name",
      "business_contact",
    ]);
  }

  query = query.order("converted_at", { ascending: false });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (data as Account[]) ?? [],
    count: total,
    page,
    limit,
    totalPages,
  };
}

export async function getAccountBySalesLeadId(
  salesLeadId: string
): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("sales_lead_id", salesLeadId)
    .eq("is_deleted", false)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

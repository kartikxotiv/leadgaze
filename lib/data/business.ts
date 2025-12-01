import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";
import {
  buildSearchQuery,
  buildWhereFilters,
  paginateQuery,
  type PaginationResult,
} from "../utils/supabase-queries";

// Temporary types until database.types.ts is regenerated after migration
export type Business = {
  id: string;
  business_name: string | null;
  business_type: string | null;
  industry: string | null;
  business_contact: string | null;
  business_size: string | null;
  business_country: string | null;
  website: string | null;
  description: string | null;
  account_owner: string | null;
  business_address: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessInsert = {
  id?: string;
  business_name?: string | null;
  business_type?: string | null;
  industry?: string | null;
  business_contact?: string | null;
  business_size?: string | null;
  business_country?: string | null;
  website?: string | null;
  description?: string | null;
  account_owner?: string | null;
  business_address?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BusinessUpdate = {
  id?: string;
  business_name?: string | null;
  business_type?: string | null;
  industry?: string | null;
  business_contact?: string | null;
  business_size?: string | null;
  business_country?: string | null;
  website?: string | null;
  description?: string | null;
  account_owner?: string | null;
  business_address?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Uncomment these once database.types.ts is regenerated after migration:
// export type Business = Database["public"]["Tables"]["business"]["Row"];
// export type BusinessInsert =
//   Database["public"]["Tables"]["business"]["Insert"];
// export type BusinessUpdate =
//   Database["public"]["Tables"]["business"]["Update"];

export async function getBusiness(): Promise<Business[]> {
  const { data, error } = await supabase
    .from("business")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getBusinessById(
  businessId: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("business")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data ?? null;
}

export async function getBusinessPaginated(
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<Business>> {
  const effectiveFilters: Record<string, any> = {
    ...(filters ?? {}),
  };

  let query = supabase.from("business").select("*", { count: "exact" });

  if (effectiveFilters && Object.keys(effectiveFilters).length > 0) {
    query = buildWhereFilters(query, effectiveFilters);
  }

  if (search) {
    query = buildSearchQuery(query, search, [
      "business_name",
      "business_type",
      "industry",
      "business_contact",
      "business_country",
      "account_owner",
      "description",
    ]);
  }

  query = query.order("created_at", { ascending: false });

  // Apply pagination manually since we're using count
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (data as Business[]) ?? [],
    count: total,
    page,
    limit,
    totalPages,
  };
}

export async function createBusiness(input: BusinessInsert): Promise<Business> {
  const payload: BusinessInsert = {
    ...input,
  };

  const { data, error } = await supabase
    .from("business")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as Business;
}

export async function updateBusiness(
  businessId: string,
  updates: BusinessUpdate
): Promise<Business> {
  const { data, error } = await supabase
    .from("business")
    .update({
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    })
    .eq("id", businessId)
    .select()
    .single();

  if (error) throw error;
  return data as Business;
}

export async function deleteBusiness(businessId: string): Promise<boolean> {
  const { error } = await supabase
    .from("business")
    .delete()
    .eq("id", businessId);

  if (error) throw error;
  return true;
}

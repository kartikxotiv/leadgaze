import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";
import {
  paginateQuery,
  buildSearchQuery,
  buildWhereFilters,
  type PaginationResult,
} from "../utils/supabase-queries";

export type SalesContact =
  Database["public"]["Tables"]["sales_contacts"]["Row"];
export type SalesContactInsert =
  Database["public"]["Tables"]["sales_contacts"]["Insert"];
export type SalesContactUpdate =
  Database["public"]["Tables"]["sales_contacts"]["Update"];

type CompanySummary = Pick<
  Database["public"]["Tables"]["companies"]["Row"],
  "id" | "title" | "location"
>;

type ContactPlatform = Database["public"]["Tables"]["contact_platforms"]["Row"];

export type SalesContactWithRelations = SalesContact & {
  company?: CompanySummary | null;
  platform_config?: ContactPlatform | null;
};

export async function getSalesContacts(): Promise<SalesContact[]> {
  const { data, error } = await supabase
    .from("sales_contacts")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getSalesContactById(
  contactId: string
): Promise<SalesContact | null> {
  const { data, error } = await supabase
    .from("sales_contacts")
    .select("*")
    .eq("id", contactId)
    .eq("is_deleted", false)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function getSalesContactWithRelations(
  contactId: string
): Promise<SalesContactWithRelations | null> {
  const { data, error } = await supabase
    .from("sales_contacts")
    .select(
      `
        *,
        company:companies!sales_contacts_company_id_fkey (
          id,
          title,
          location
        ),
        platform_config:contact_platforms!sales_contacts_platform_fkey (
          id,
          name
        )
      `
    )
    .eq("id", contactId)
    .eq("is_deleted", false)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as SalesContactWithRelations) || null;
}

export async function getSalesContactsPaginated(
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<SalesContact>> {
  const effectiveFilters = {
    is_deleted: false,
    ...(filters || {}),
  };

  let query = supabase.from("sales_contacts").select("*");

  if (effectiveFilters) {
    query = buildWhereFilters(query, effectiveFilters);
  }

  if (search) {
    query = buildSearchQuery(query, search, [
      "first_name",
      "last_name",
      "email",
      "phone_number",
      "location",
    ]);
  }

  query = query.order("created_at", { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createSalesContact(
  input: SalesContactInsert
): Promise<SalesContact> {
  const payload = {
    ...input,
    is_deleted: input.is_deleted ?? false,
  };

  const { data, error } = await supabase
    .from("sales_contacts")
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data as SalesContact;
}

export async function updateSalesContact(
  contactId: string,
  updates: SalesContactUpdate
): Promise<SalesContact> {
  const { data, error } = await supabase
    .from("sales_contacts")
    .update({
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    })
    .eq("id", contactId)
    .eq("is_deleted", false)
    .select()
    .single();

  if (error) throw error;
  return data as SalesContact;
}

export async function deleteSalesContact(contactId: string): Promise<boolean> {
  const { error } = await supabase
    .from("sales_contacts")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  if (error) throw error;
  return true;
}

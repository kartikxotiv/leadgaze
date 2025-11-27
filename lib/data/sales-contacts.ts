import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";
import {
  paginateQuery,
  buildSearchQuery,
  buildWhereFilters,
  buildDateRange,
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
  search?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<PaginationResult<SalesContact>> {
  const effectiveFilters = {
    is_deleted: false,
    ...(filters || {}),
  };

  let query = supabase.from("sales_contacts").select("*", { count: "exact" });

  if (effectiveFilters) {
    query = buildWhereFilters(query, effectiveFilters);
  }

  // Apply date range filter on created_at
  if (dateFrom || dateTo) {
    query = buildDateRange(query, "created_at", dateFrom, dateTo);
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

  // Apply pagination manually since we're using count
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (data as SalesContact[]) ?? [],
    count: total,
    page,
    limit,
    totalPages,
  };
}

export async function checkEmailExists(
  email: string | null | undefined,
  workspaceId: string,
  excludeContactId?: string
): Promise<boolean> {
  if (!email || !email.trim()) {
    return false; // Empty emails are allowed (email is nullable)
  }

  let query = supabase
    .from("sales_contacts")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false)
    .limit(1);

  if (excludeContactId) {
    query = query.neq("id", excludeContactId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function createSalesContact(
  input: SalesContactInsert
): Promise<SalesContact> {
  // Check for duplicate email in the same workspace
  if (input.email && input.workspace_id) {
    const emailExists = await checkEmailExists(input.email, input.workspace_id);
    if (emailExists) {
      throw new Error(
        "A contact with this email already exists in this workspace."
      );
    }
  }

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
  // Check for duplicate email if email is being updated
  if (updates.email !== undefined) {
    // First get the current contact to get workspace_id
    const currentContact = await getSalesContactById(contactId);
    if (!currentContact) {
      throw new Error("Contact not found");
    }

    if (updates.email && currentContact.workspace_id) {
      const emailExists = await checkEmailExists(
        updates.email,
        currentContact.workspace_id,
        contactId // Exclude current contact from check
      );
      if (emailExists) {
        throw new Error(
          "A contact with this email already exists in this workspace."
        );
      }
    }
  }

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

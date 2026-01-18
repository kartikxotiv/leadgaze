import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";
import {
  buildSearchQuery,
  buildWhereFilters,
  buildDateRange,
  paginateQuery,
  type PaginationResult,
} from "../utils/supabase-queries";

export type SalesLead = Database["public"]["Tables"]["sales_leads"]["Row"];
export type SalesLeadInsert =
  Database["public"]["Tables"]["sales_leads"]["Insert"];
export type SalesLeadUpdate =
  Database["public"]["Tables"]["sales_leads"]["Update"];

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

export async function getSalesLeadById(
  leadId: string
): Promise<SalesLead | null> {
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
  search?: string,
  userId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<PaginationResult<SalesLead>> {
  let effectiveFilters: Record<string, any> = {
    is_deleted: false,
    ...(filters ?? {}),
  };

  let query = supabase.from("sales_leads").select("*", { count: "exact" });

  // If userId is provided, filter leads assigned to that user
  if (userId) {
    console.log(`🔍 Filtering leads for userId: ${userId}`);

    // Get workspace_id from filters if present
    const workspaceId = effectiveFilters.workspace_id;
    console.log(`🏢 Workspace filter: ${workspaceId || "none"}`);

    // First get all lead IDs assigned to this user, along with workspace_id
    let assignedLeadsQuery = supabase
      .from("leads_assignees")
      .select(
        `
        lead_id,
        sales_lead:sales_leads!leads_assignees_lead_id_fkey (
          id,
          workspace_id
        )
      `
      )
      .eq("user_id", userId);

    const { data: assignedLeads, error: assigneesError } =
      await assignedLeadsQuery;

    if (assigneesError) {
      console.error("❌ Error fetching assigned leads:", assigneesError);
      throw assigneesError;
    }

    console.log(
      `✅ Found ${
        assignedLeads?.length || 0
      } assigned leads for user ${userId}`,
      assignedLeads
    );

    if (assignedLeads && assignedLeads.length > 0) {
      // If workspace filter is present, filter by both assigned leads AND workspace
      // Otherwise, show all assigned leads
      let leadIds: string[] = [];

      if (workspaceId) {
        // Filter assigned leads by workspace
        leadIds = assignedLeads
          .filter((item: any) => {
            const leadWorkspaceId = item.sales_lead?.workspace_id;
            const matches = leadWorkspaceId === workspaceId;
            if (!matches) {
              console.log(
                `⚠️ Lead ${item.lead_id} is in workspace ${leadWorkspaceId}, but current workspace is ${workspaceId}`
              );
            }
            return matches;
          })
          .map((item: any) => item.lead_id);
        console.log(
          `📋 After workspace filter: ${leadIds.length} leads match workspace ${workspaceId}`
        );
      } else {
        // No workspace filter - show all assigned leads
        leadIds = assignedLeads.map((item: any) => item.lead_id);
        console.log(
          `📋 No workspace filter - showing all ${leadIds.length} assigned leads`
        );
      }

      if (leadIds.length > 0) {
        console.log(
          `📋 Filtering sales_leads by ${leadIds.length} assigned lead IDs:`,
          leadIds
        );
        query = query.in("id", leadIds);
        // Remove workspace_id from filters since we already filtered by it
        const { workspace_id, ...otherFilters } = effectiveFilters;
        effectiveFilters = { ...otherFilters, is_deleted: false };
      } else {
        // User has assigned leads but none in current workspace
        console.log(
          `⚠️ User has ${assignedLeads.length} assigned leads but none in workspace ${workspaceId} - returning empty result`
        );
        return {
          data: [],
          count: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    } else {
      // User has no assigned leads, return empty result
      console.log(
        `⚠️ No assigned leads found for user ${userId} - returning empty result`
      );
      return {
        data: [],
        count: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  } else {
    console.log(
      "ℹ️ No userId provided - showing all leads (if no workspace filter)"
    );
  }

  if (effectiveFilters) {
    console.log(`🔍 Applying remaining filters:`, effectiveFilters);
    query = buildWhereFilters(query, effectiveFilters);
  }

  // Apply date range filter on created_at
  if (dateFrom || dateTo) {
    query = buildDateRange(query, "created_at", dateFrom, dateTo);
  }

  if (search) {
    console.log(`🔍 Applying search: ${search}`);
    query = buildSearchQuery(query, search, [
      "first_name",
      "last_name",
      "email",
      "location",
      "contact_time_zone",
    ]);
  }

  query = query.order("created_at", { ascending: false });

  // Apply pagination manually since we're using count
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  console.log(
    `📊 Executing query - page: ${page}, limit: ${limit}, from: ${from}, to: ${to}`
  );
  const { data, error, count } = await query;

  console.log(
    `✅ Query result - found ${data?.length || 0} leads, total count: ${count}`
  );

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: (data as SalesLead[]) ?? [],
    count: total,
    page,
    limit,
    totalPages,
  };
}

export async function checkEmailExists(
  email: string | null | undefined,
  workspaceId: string,
  excludeLeadId?: string
): Promise<boolean> {
  if (!email || !email.trim()) {
    return false; // Empty emails are allowed (email is nullable)
  }

  let query = supabase
    .from("sales_leads")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false)
    .limit(1);

  if (excludeLeadId) {
    query = query.neq("id", excludeLeadId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function createSalesLead(
  input: SalesLeadInsert
): Promise<SalesLead> {
  // Check for duplicate email in the same workspace
  if (input.email && input.workspace_id) {
    const emailExists = await checkEmailExists(input.email, input.workspace_id);
    if (emailExists) {
      throw new Error(
        "A lead with this email already exists in this workspace."
      );
    }
  }

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
  // Check for duplicate email if email is being updated
  if (updates.email !== undefined) {
    // First get the current lead to get workspace_id
    const currentLead = await getSalesLeadById(leadId);
    if (!currentLead) {
      throw new Error("Lead not found");
    }

    if (updates.email && currentLead.workspace_id) {
      const emailExists = await checkEmailExists(
        updates.email,
        currentLead.workspace_id,
        leadId // Exclude current lead from check
      );
      if (emailExists) {
        throw new Error(
          "A lead with this email already exists in this workspace."
        );
      }
    }
  }

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

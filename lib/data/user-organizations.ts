import { supabase } from "../supabase-client";
import type { UserOrganization } from "../types/database";

export async function getUserOrganization(
  userId: string,
  organizationId: string
): Promise<UserOrganization | null> {
  const { data, error } = await supabase
    .from("user_organizations")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getUserOrganizations(
  userId: string
): Promise<UserOrganization[]> {
  const { data, error } = await supabase
    .from("user_organizations")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
}

export async function getOrganizationUsers(
  organizationId: string,
  includeInactive: boolean = false
): Promise<UserOrganization[]> {
  // Only return active members by default
  // Status can be 'active' or null (null means active by default)
  let query = supabase
    .from("user_organizations")
    .select("*")
    .eq("organization_id", organizationId);

  if (!includeInactive) {
    // Filter for active status or null status (null means active by default)
    // Using .or() with proper syntax: "column.operator.value,column.operator.value"
    query = query.or("status.eq.active,status.is.null");
  }

  const { data, error } = await query;

  // Debug logging
  if (error) {
    console.error(
      `❌ [getOrganizationUsers] Error for org ${organizationId}:`,
      error
    );
    throw error;
  }

  console.log(
    `🔍 [getOrganizationUsers] Query result for org ${organizationId}: ${
      data?.length || 0
    } records (includeInactive: ${includeInactive})`
  );
  if (data && data.length > 0) {
    console.log(
      `🔍 [getOrganizationUsers] User IDs:`,
      data.map((uo) => uo.user_id)
    );
    console.log(
      `🔍 [getOrganizationUsers] Statuses:`,
      data.map((uo) => (uo as any).status || "null")
    );
  }

  return data || [];
}

export async function createUserOrganization(
  userOrgData: Partial<UserOrganization>
): Promise<UserOrganization> {
  // Check if user_id and organization_id are provided
  if (!userOrgData.user_id || !userOrgData.organization_id) {
    throw new Error("user_id and organization_id are required");
  }

  // Check if relationship already exists
  const existing = await getUserOrganization(
    userOrgData.user_id,
    userOrgData.organization_id
  );

  if (existing) {
    // If exists, return existing instead of updating (to avoid errors)
    console.log(
      `ℹ️ User organization relationship already exists for user ${userOrgData.user_id} and org ${userOrgData.organization_id}. Returning existing.`
    );
    // Return existing record directly - no need to update
    return existing as any; // Type cast needed due to interface mismatch
  }

  // Create new relationship
  const { data, error } = await supabase
    .from("user_organizations")
    .insert([userOrgData])
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation gracefully
    if (error.code === "23505") {
      // Unique constraint violation - relationship already exists
      const existing = await getUserOrganization(
        userOrgData.user_id,
        userOrgData.organization_id
      );
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
  return data;
}

export async function updateUserOrganization(
  userOrganizationId: string,
  updates: Partial<UserOrganization>
): Promise<UserOrganization> {
  const { data, error } = await supabase
    .from("user_organizations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userOrganizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUserOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("user_organizations")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", organizationId);

  if (error) throw error;
  return true;
}

export async function updateUserOrganizationRole(
  userId: string,
  organizationId: string,
  roleId: string
): Promise<UserOrganization> {
  const existing = await getUserOrganization(userId, organizationId);
  if (!existing) {
    throw new Error("User organization relationship not found");
  }
  // Database uses 'id' as primary key, but type uses 'user_organization_id'
  const existingId = (existing as any).id || existing.user_organization_id;
  return updateUserOrganization(existingId, {
    role_id: roleId,
  });
}

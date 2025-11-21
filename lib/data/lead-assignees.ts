import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";

export type LeadAssignee = Database["public"]["Tables"]["leads_assignees"]["Row"];
export type LeadAssigneeInsert = Database["public"]["Tables"]["leads_assignees"]["Insert"];

export type LeadAssigneeWithUser = LeadAssignee & {
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
};

/**
 * Get all assignees for a specific lead
 */
export async function getLeadAssignees(
  leadId: string
): Promise<LeadAssigneeWithUser[]> {
  const { data, error } = await supabase
    .from("leads_assignees")
    .select(
      `
      *,
      user:users!leads_assignees_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as LeadAssigneeWithUser[]) ?? [];
}

/**
 * Add an assignee to a lead
 */
export async function addLeadAssignee(
  leadId: string,
  userId: string
): Promise<LeadAssignee> {
  // Check if assignee already exists
  const { data: existing } = await supabase
    .from("leads_assignees")
    .select("id")
    .eq("lead_id", leadId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    throw new Error("User is already assigned to this lead");
  }

  const { data, error } = await supabase
    .from("leads_assignees")
    .insert([
      {
        lead_id: leadId,
        user_id: userId,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as LeadAssignee;
}

/**
 * Remove an assignee from a lead
 */
export async function removeLeadAssignee(
  leadId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("leads_assignees")
    .delete()
    .eq("lead_id", leadId)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

/**
 * Update multiple assignees for a lead (replace all)
 */
export async function updateLeadAssignees(
  leadId: string,
  userIds: string[]
): Promise<LeadAssigneeWithUser[]> {
  // First, remove all existing assignees
  await supabase.from("leads_assignees").delete().eq("lead_id", leadId);

  // If no new assignees, return empty array
  if (userIds.length === 0) {
    return [];
  }

  // Add new assignees
  const inserts = userIds.map((userId) => ({
    lead_id: leadId,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("leads_assignees")
    .insert(inserts)
    .select(
      `
      *,
      user:users!leads_assignees_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email
      )
    `
    );

  if (error) throw error;
  return (data as LeadAssigneeWithUser[]) ?? [];
}

/**
 * Get all leads assigned to a specific user
 */
export async function getLeadsForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("leads_assignees")
    .select("lead_id")
    .eq("user_id", userId);

  if (error) throw error;
  return data?.map((item) => item.lead_id) ?? [];
}


import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";

export type LeadPriority =
  Database["public"]["Tables"]["lead_priorities"]["Row"];
export type LeadPriorityInsert =
  Database["public"]["Tables"]["lead_priorities"]["Insert"];
export type LeadPriorityUpdate =
  Database["public"]["Tables"]["lead_priorities"]["Update"];

export async function getLeadPriorities(): Promise<LeadPriority[]> {
  const { data, error } = await supabase
    .from("lead_priorities")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createLeadPriority(
  input: Pick<LeadPriorityInsert, "name" | "color">
): Promise<LeadPriority> {
  const { data, error } = await supabase
    .from("lead_priorities")
    .insert({
      name: input.name,
      color: input.color,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as LeadPriority;
}

export async function updateLeadPriority(
  id: string,
  updates: Pick<LeadPriorityUpdate, "name" | "color">
): Promise<LeadPriority> {
  const { data, error } = await supabase
    .from("lead_priorities")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as LeadPriority;
}

export async function deleteLeadPriority(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("lead_priorities")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}

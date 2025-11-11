import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";

export type LeadComment = Database["public"]["Tables"]["lead_comments"]["Row"];
export type LeadCommentInsert = Database["public"]["Tables"]["lead_comments"]["Insert"];

export async function getLeadComments(leadId: string): Promise<LeadComment[]> {
  const { data, error } = await supabase
    .from("lead_comments")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createLeadComment(
  leadId: string,
  comment: string,
  createdBy?: string | null
): Promise<LeadComment> {
  const payload: LeadCommentInsert = {
    lead_id: leadId,
    comment,
    created_by: createdBy ?? null,
  };

  const { data, error } = await supabase
    .from("lead_comments")
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as LeadComment;
}

export async function deleteLeadComment(commentId: string): Promise<boolean> {
  const { error } = await supabase.from("lead_comments").delete().eq("id", commentId);

  if (error) {
    throw error;
  }

  return true;
}


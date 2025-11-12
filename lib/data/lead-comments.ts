import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";

export type LeadComment = Database["public"]["Tables"]["lead_comments"]["Row"];
export type LeadCommentInsert = Database["public"]["Tables"]["lead_comments"]["Insert"];

export interface LeadCommentWithUser extends LeadComment {
  created_by_user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export async function getLeadComments(leadId: string): Promise<LeadCommentWithUser[]> {
  const { data, error } = await supabase
    .from("lead_comments")
    .select(`
      *,
      created_by_user:users!lead_comments_created_by_fkey(
        user_id,
        first_name,
        last_name,
        email
      )
    `)
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


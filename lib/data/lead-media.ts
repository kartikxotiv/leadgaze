import { supabase } from "../supabase-client";

export interface LeadMedia {
  id: string;
  lead_id: string;
  media_url: string;
  media_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function getLeadMediaById(
  mediaId: string
): Promise<LeadMedia | null> {
  const { data, error } = await supabase
    .from("lead_media")
    .select("*")
    .eq("id", mediaId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function getLeadMediaByLeadId(
  leadId: string
): Promise<LeadMedia[]> {
  const { data, error } = await supabase
    .from("lead_media")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createLeadMedia(
  mediaData: Partial<LeadMedia>
): Promise<LeadMedia> {
  const { data, error } = await supabase
    .from("lead_media")
    .insert([mediaData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeadMedia(
  mediaId: string,
  updates: Partial<LeadMedia>
): Promise<LeadMedia> {
  const { data, error } = await supabase
    .from("lead_media")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", mediaId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLeadMedia(mediaId: string): Promise<boolean> {
  const { error } = await supabase
    .from("lead_media")
    .delete()
    .eq("id", mediaId);

  if (error) throw error;
  return true;
}


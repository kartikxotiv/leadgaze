import { supabase } from "../supabase-client";
import type { Database } from "../../database.types";

export type ContactPlatform =
  Database["public"]["Tables"]["contact_platforms"]["Row"];

export async function getContactPlatforms(): Promise<ContactPlatform[]> {
  const { data, error } = await supabase
    .from("contact_platforms")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createContactPlatform(
  name: string
): Promise<ContactPlatform> {
  const trimmedName = name.trim();

  const { data, error } = await supabase
    .from("contact_platforms")
    .insert([{ name: trimmedName }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


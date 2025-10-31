import { supabase } from '../supabase-client';
import type { PasswordResetToken } from '../types/database';

export async function getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | null> {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getPasswordResetTokenByUserId(userId: string): Promise<PasswordResetToken | null> {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createPasswordResetToken(
  tokenData: Partial<PasswordResetToken>
): Promise<PasswordResetToken> {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .insert([tokenData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function markTokenAsUsed(id: string): Promise<PasswordResetToken> {
  const { data, error } = await supabase
    .from('password_reset_tokens')
    .update({ used: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deletePasswordResetToken(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('password_reset_tokens')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

export async function deleteExpiredPasswordResetTokens(): Promise<number> {
  // First get count of expired tokens
  const { count: expiredCount } = await supabase
    .from('password_reset_tokens')
    .select('*', { count: 'exact', head: true })
    .lt('expires_at', new Date().toISOString());
  
  // Then delete them
  const { error } = await supabase
    .from('password_reset_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());
  
  if (error) throw error;
  return expiredCount || 0;
}

export async function countRecentPasswordResetTokens(
  userId: string,
  hours: number = 24
): Promise<number> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);
  
  const { count, error } = await supabase
    .from('password_reset_tokens')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', cutoff.toISOString());
  
  if (error) throw error;
  return count || 0;
}


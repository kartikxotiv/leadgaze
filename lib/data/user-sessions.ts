import { supabase } from '../supabase-client';
import type { UserSession } from '../types/database';

export async function createSession(sessionData: Partial<UserSession>): Promise<UserSession> {
  const { data, error } = await supabase
    .from('user_sessions')
    .insert([sessionData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getSessionByToken(token: string): Promise<UserSession | null> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getSessionsByUserId(userId: string): Promise<UserSession[]> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString());
  
  if (error) throw error;
  return data || [];
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('session_id', sessionId);
  
  if (error) throw error;
  return true;
}

export async function deleteSessionByToken(token: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('token', token);
  
  if (error) throw error;
  return true;
}

export async function deleteUserSessions(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_sessions')
    .delete()
    .eq('user_id', userId);
  
  if (error) throw error;
  return true;
}

export async function deleteExpiredSessions(): Promise<number> {
  const { error, count } = await supabase
    .from('user_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}


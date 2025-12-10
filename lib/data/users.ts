import { supabase } from '../supabase-client';
import type { User } from '../types/database';

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  
  // PGRST116 = no rows returned (not an error for this function)
  if (error && error.code !== 'PGRST116') {
    // Convert Supabase error to Error instance
    const errorObj = new Error(error.message || 'Failed to fetch user by email');
    (errorObj as any).code = error.code;
    (errorObj as any).hint = error.hint;
    (errorObj as any).details = error.details;
    (errorObj as any).supabaseError = error;
    throw errorObj;
  }
  return data;
}

export async function createUser(userData: Partial<User>): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('user_id', userId);
  
  if (error) throw error;
  return true;
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('user_id', userIds);
  
  if (error) throw error;
  return data || [];
}

export async function updateUserLoginAttempts(
  userId: string,
  attempts: number,
  lockUntil?: string
): Promise<User> {
  const updates: Partial<User> = {
    login_attempts: attempts,
    updated_at: new Date().toISOString(),
  };
  
  if (lockUntil) {
    updates.lock_until = lockUntil;
  }
  
  return updateUser(userId, updates);
}

export async function updateUserLastLogin(userId: string): Promise<User> {
  return updateUser(userId, {
    last_login: new Date().toISOString(),
    login_attempts: 0,
    lock_until: undefined, // Use undefined instead of null for TypeScript
  });
}

export async function updatePasswordResetToken(
  userId: string,
  token: string | null,
  expiresAt: string | null
): Promise<User> {
  return updateUser(userId, {
    password_reset_token: token || undefined,
    password_reset_expires: expiresAt || undefined,
  });
}

export async function markEmailVerified(userId: string): Promise<User> {
  return updateUser(userId, {
    email_verified: true,
  });
}


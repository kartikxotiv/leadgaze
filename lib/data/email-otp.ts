import { supabase } from '../supabase-client';
import type { EmailOTP } from '../types/database';

export async function getOTPById(id: string): Promise<EmailOTP | null> {
  const { data, error } = await supabase
    .from('email_otps')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getOTPByEmailAndPurpose(
  email: string,
  purpose: string
): Promise<EmailOTP | null> {
  const { data, error } = await supabase
    .from('email_otps')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('purpose', purpose)
    .gt('expires_at', new Date().toISOString())
    .eq('verified', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createOTP(otpData: Partial<EmailOTP>): Promise<EmailOTP> {
  const { data, error } = await supabase
    .from('email_otps')
    .insert([otpData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function verifyOTP(id: string): Promise<EmailOTP> {
  const { data, error } = await supabase
    .from('email_otps')
    .update({ verified: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function incrementOTPAttempts(id: string): Promise<EmailOTP> {
  const otp = await getOTPById(id);
  if (!otp) {
    throw new Error('OTP not found');
  }
  
  const { data, error } = await supabase
    .from('email_otps')
    .update({ attempts: otp.attempts + 1, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteOTP(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('email_otps')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

export async function deleteExpiredOTPs(): Promise<number> {
  const { error, count } = await supabase
    .from('email_otps')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}

export async function getAllOTPsByEmail(email: string): Promise<EmailOTP[]> {
  const { data, error } = await supabase
    .from('email_otps')
    .select('*')
    .eq('email', email.toLowerCase())
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Helper function to invalidate existing OTPs
export async function invalidateOTPs(email: string, purpose: string): Promise<void> {
  await supabase
    .from('email_otps')
    .update({ verified: true })
    .eq('email', email.toLowerCase())
    .eq('purpose', purpose)
    .eq('verified', false);
}

// Helper function to create OTP with code generation
export async function createEmailOTP(
  email: string,
  purpose: string,
  expiresInMinutes: number = 10
): Promise<EmailOTP> {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

  // Invalidate existing OTPs first
  await invalidateOTPs(email, purpose);

  return createOTP({
    email: email.toLowerCase(),
    purpose,
    otp,
    expires_at: expiresAt.toISOString(),
    verified: false,
    attempts: 0,
  });
}


import { supabase } from '../supabase-client';
import type { UserInvitation } from '../types/database';

export async function getInvitationById(invitationId: string): Promise<UserInvitation | null> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('invitation_id', invitationId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getInvitationByToken(token: string): Promise<UserInvitation | null> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getInvitationsByEmail(email: string): Promise<UserInvitation[]> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('email', email.toLowerCase())
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getInvitationsByOrganization(organizationId: string): Promise<UserInvitation[]> {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createInvitation(invitationData: Partial<UserInvitation>): Promise<UserInvitation> {
  const { data, error } = await supabase
    .from('user_invitations')
    .insert([invitationData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateInvitation(
  invitationId: string,
  updates: Partial<UserInvitation>
): Promise<UserInvitation> {
  const { data, error } = await supabase
    .from('user_invitations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('invitation_id', invitationId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function acceptInvitation(invitationId: string): Promise<UserInvitation> {
  return updateInvitation(invitationId, {
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  });
}

export async function deleteInvitation(invitationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_invitations')
    .delete()
    .eq('invitation_id', invitationId);
  
  if (error) throw error;
  return true;
}

export async function deleteExpiredInvitations(): Promise<number> {
  // First get count of expired invitations
  const { count: expiredCount } = await supabase
    .from('user_invitations')
    .select('*', { count: 'exact', head: true })
    .lt('expires_at', new Date().toISOString())
    .eq('status', 'pending');
  
  // Then delete them
  const { error } = await supabase
    .from('user_invitations')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .eq('status', 'pending');
  
  if (error) throw error;
  return expiredCount || 0;
}


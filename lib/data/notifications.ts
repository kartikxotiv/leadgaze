import { supabase } from '../supabase-client';
import type { Notification } from '../types/database';
import { paginateQuery } from '../utils/supabase-queries';
import type { PaginationResult } from '../utils/supabase-queries';

export async function getNotificationById(notificationId: string): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('notification_id', notificationId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createNotification(notificationData: Partial<Notification>): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert([notificationData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function createBulkNotifications(
  notificationsData: Partial<Notification>[]
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationsData)
    .select();
  
  if (error) throw error;
  return data || [];
}

export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: string[];
  } = {}
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId);

  if (options.unreadOnly) {
    query = query.eq('read', false);
  }

  if (options.types && options.types.length > 0) {
    query = query.in('type', options.types);
  }

  // Filter out expired notifications
  query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  query = query
    .order('created_at', { ascending: false })
    .range(
      options.offset || 0,
      (options.offset || 0) + (options.limit || 50) - 1
    );

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (error) throw error;
  return count || 0;
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('notification_id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateNotification(
  notificationId: string,
  updates: Partial<Notification>
): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('notification_id', notificationId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('notification_id', notificationId);
  
  if (error) throw error;
  return true;
}

export async function deleteExpiredNotifications(): Promise<number> {
  const { error, count } = await supabase
    .from('notifications')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}


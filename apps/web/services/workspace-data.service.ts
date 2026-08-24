import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

/**
 * Workspace Data Service
 * 
 * Replaces direct Supabase calls from frontend with backend API calls.
 * This service handles workspace-specific data that's not part of the 
 * main initialization flow but is needed by various components.
 */

// Type definitions
export interface WorkspaceCurrency {
  currency_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePreference {
  id: string;
  workspace_id: string;
  timezone: string;
  date_format?: string;
  time_format?: string;
  week_start_day?: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingReminder {
  id: string;
  meeting_id: string;
  offset_minutes: number;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
  source?: string;
}

/**
 * Get workspace currencies with exchange rates
 * Replaces: supabase.from('workspace_currencies') + exchange_rates queries
 */
export const getWorkspaceCurrenciesService = asyncHandlerClient(
  async (workspaceId: string): Promise<{
    currencies: WorkspaceCurrency[];
    exchangeRates: ExchangeRate[];
  }> => {
    const response = await ApiClient.get(`/workspace/${workspaceId}/currencies`);
    return response.data.data;
  }
);

/**
 * Get workspace preferences (timezone, formats, etc.)
 * Replaces: supabase.from('workspace_preferences')
 */
export const getWorkspacePreferencesService = asyncHandlerClient(
  async (workspaceId: string): Promise<WorkspacePreference> => {
    const response = await ApiClient.get(`/workspace/${workspaceId}/preferences`);
    return response.data.data;
  }
);

/**
 * Update workspace preferences
 */
export const updateWorkspacePreferencesService = asyncHandlerClient(
  async (workspaceId: string, preferences: Partial<WorkspacePreference>): Promise<WorkspacePreference> => {
    const response = await ApiClient.put(`/workspace/${workspaceId}/preferences`, preferences);
    return response.data.data;
  }
);

/**
 * Get meeting reminders for a specific meeting
 * Replaces: supabase.from('meeting_reminders')
 */
export const getMeetingRemindersService = asyncHandlerClient(
  async (meetingId: string): Promise<MeetingReminder[]> => {
    const response = await ApiClient.get(`/meetings/${meetingId}/reminders`);
    return response.data.data;
  }
);

/**
 * Create meeting reminder
 */
export const createMeetingReminderService = asyncHandlerClient(
  async (meetingId: string, offsetMinutes: number): Promise<MeetingReminder> => {
    const response = await ApiClient.post(`/meetings/${meetingId}/reminders`, {
      offset_minutes: offsetMinutes,
    });
    return response.data.data;
  }
);

/**
 * Delete meeting reminder
 */
export const deleteMeetingReminderService = asyncHandlerClient(
  async (reminderId: string): Promise<void> => {
    await ApiClient.delete(`/meetings/reminders/${reminderId}`);
  }
);

/**
 * Get workspace members with account details
 * Replaces: supabase.from('workspace_members').select(...accounts...)
 * 
 * This is different from the team members service as it includes
 * full account details for integration purposes
 */
export const getWorkspaceMembersWithAccountsService = asyncHandlerClient(
  async (workspaceId: string): Promise<Array<{
    user_id: string;
    accounts: {
      id: string;
      name: string;
      email: string;
    };
  }>> => {
    const response = await ApiClient.get(`/workspace/${workspaceId}/members-with-accounts`);
    return response.data.data;
  }
);

/**
 * Utility: Get default workspace currency
 */
export const getDefaultCurrencyService = asyncHandlerClient(
  async (workspaceId: string): Promise<string> => {
    const { currencies } = await getWorkspaceCurrenciesService(workspaceId);
    const defaultCurrency = currencies.find(c => c.is_default);
    return defaultCurrency?.currency_code || 'USD';
  }
);

/**
 * Utility: Get workspace timezone
 */
export const getWorkspaceTimezoneService = asyncHandlerClient(
  async (workspaceId: string): Promise<string> => {
    const preferences = await getWorkspacePreferencesService(workspaceId);
    return preferences.timezone || 'UTC';
  }
);

/**
 * Cache-aware wrapper for workspace preferences
 * Checks sessionStorage first, then falls back to API
 */
export const getCachedWorkspacePreferencesService = asyncHandlerClient(
  async (workspaceId: string): Promise<WorkspacePreference> => {
    // Try to get from workspace initialization cache first
    if (typeof window !== 'undefined') {
      try {
        const cachedInit = sessionStorage.getItem(`workspace-${workspaceId}-init`);
        if (cachedInit) {
          const initData = JSON.parse(cachedInit);
          const workspaceInfo = initData?.current_workspace?.dashboard_data?.workspace_info;
          if (workspaceInfo) {
            return {
              id: workspaceInfo.id,
              workspace_id: workspaceId,
              timezone: workspaceInfo.timezone || 'UTC',
              created_at: workspaceInfo.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        }
      } catch (error) {
        console.warn('[Workspace Data] Failed to get cached preferences:', error);
      }
    }
    
    // Fallback to API call
    return getWorkspacePreferencesService(workspaceId);
  }
);

// Re-export types for convenience
export type {
  WorkspaceCurrency,
  WorkspacePreference,
  MeetingReminder,
  ExchangeRate,
};
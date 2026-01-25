/**
 * Permission-based Dynamic Navigation Hook
 * Filters navigation items based on the new permission system
 */
'use client';

import { useMemo } from 'react';

import { BarChart3, Briefcase, ShieldCheck, User, Users } from 'lucide-react';

import pathsConfig from '~/config/paths.config';
import { useAccessibleModules } from '~/lib/permissions';

/**
 * Permission-based Dynamic Navigation Hook
 * Filters navigation items based on the new permission system
 */

/**
 * Permission-based Dynamic Navigation Hook
 * Filters navigation items based on the new permission system
 */

interface NavItem {
  label: string;
  path: string;
  Icon: React.ComponentType<{ className?: string }>;
  moduleKey: string;
  featureKey: string;
}

// Define all available navigation items with their module and feature mappings
const ALL_NAV_ITEMS: NavItem[] = [
  {
    label: 'Leads',
    path: pathsConfig.app.leads,
    Icon: Users,
    moduleKey: 'leads',
    featureKey: 'view',
  },
  {
    label: 'Contacts',
    path: pathsConfig.app.contacts,
    Icon: User,
    moduleKey: 'contacts',
    featureKey: 'view',
  },
  {
    label: 'Accounts',
    path: pathsConfig.app.accounts,
    Icon: Briefcase,
    moduleKey: 'accounts',
    featureKey: 'view',
  },
  {
    label: 'Opportunities',
    path: pathsConfig.app.opportunities,
    Icon: BarChart3,
    moduleKey: 'opportunities',
    featureKey: 'view',
  },
  {
    label: 'Team Members',
    path: pathsConfig.app.teamMembers,
    Icon: Users,
    moduleKey: 'team_members',
    featureKey: 'view',
  },
  {
    label: 'Roles',
    path: pathsConfig.app.roles,
    Icon: ShieldCheck,
    moduleKey: 'roles',
    featureKey: 'view',
  },
];

/**
 * Hook that filters navigation items based on user permissions
 * Uses the permission system to determine which modules/features are accessible
 *
 * @returns Object with salesItems and teamItems arrays
 */
export function usePermissionBasedNavigation() {
  const accessibleModules = useAccessibleModules();

  const filteredItems = useMemo(() => {
    // Build a set of accessible module keys for quick lookup
    const accessibleModuleKeys = new Set(
      accessibleModules.map((m) => m.module_key),
    );

    // Filter navigation items to only those the user has access to
    return ALL_NAV_ITEMS.filter((item) =>
      accessibleModuleKeys.has(item.moduleKey),
    );
  }, [accessibleModules]);

  // Separate into sales and team items
  const salesItems = useMemo(() => {
    return filteredItems.filter((item) =>
      ['leads', 'contacts', 'accounts', 'opportunities'].includes(
        item.moduleKey,
      ),
    );
  }, [filteredItems]);

  const teamItems = useMemo(() => {
    return filteredItems.filter((item) =>
      ['team_members', 'roles'].includes(item.moduleKey),
    );
  }, [filteredItems]);

  return {
    salesItems,
    teamItems,
    allItems: filteredItems,
    hasSalesItems: salesItems.length > 0,
    hasTeamItems: teamItems.length > 0,
  };
}

/**
 * Alternative export for backward compatibility
 * Returns items in the expected format for SidebarNavigation component
 */
export function usePermissionBasedNavigationConfig() {
  const { salesItems, teamItems } = usePermissionBasedNavigation();

  return useMemo(() => {
    return {
      salesItems: salesItems.map((item) => ({
        label: item.label,
        path: item.path,
        Icon: item.Icon,
        end: true,
      })),
      teamItems: teamItems.map((item) => ({
        label: item.label,
        path: item.path,
        Icon: item.Icon,
        end: true,
      })),
    };
  }, [salesItems, teamItems]);
}

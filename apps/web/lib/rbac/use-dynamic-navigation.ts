'use client';

import { useMemo } from 'react';

import {
  BarChart3,
  Briefcase,
  History,
  Mail,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

import pathsConfig from '~/config/paths.config';
import { useRBAC } from '~/lib/rbac/rbac-provider';

interface NavItem {
  label: string;
  path: string;
  Icon: React.ComponentType<{ className?: string }>;
  feature: string;
  module: string; // Add module key for permission system
}

// Sales Module Features
// Module key: 'leads', 'contacts', 'accounts', 'opportunities'
// Feature key: 'view' (for viewing the module)
const SALES_MODULES: NavItem[] = [
  {
    label: 'Leads',
    path: pathsConfig.app.leads,
    Icon: Users,
    feature: 'view',
    module: 'leads',
  },
  {
    label: 'Contacts',
    path: pathsConfig.app.contacts,
    Icon: User,
    feature: 'view',
    module: 'contacts',
  },
  {
    label: 'Accounts',
    path: pathsConfig.app.accounts,
    Icon: Briefcase,
    feature: 'view',
    module: 'accounts',
  },
  {
    label: 'Opportunities',
    path: pathsConfig.app.opportunities,
    Icon: BarChart3,
    feature: 'view',
    module: 'opportunities',
  },
  {
    label: 'Emails',
    path: pathsConfig.app.emails,
    Icon: Mail,
    feature: 'manage_email',
    module: 'emails',
  },
  {
    label: 'Teams',
    path: pathsConfig.app.teams,
    Icon: Users,
    feature: 'view',
    module: 'team_members',
  },
];

// Team Module Features
// Module key: 'team_members', 'roles'
// Feature key: 'view'
const TEAM_MODULES: NavItem[] = [
  {
    label: 'Members',
    path: pathsConfig.app.teamMembers,
    Icon: Users,
    feature: 'view',
    module: 'team_members',
  },
  {
    label: 'Roles',
    path: pathsConfig.app.roles,
    Icon: ShieldCheck,
    feature: 'view',
    module: 'roles',
  },
  {
    label: 'Audit Logs',
    path: pathsConfig.app.auditLogs,
    Icon: History,
    feature: 'view',
    module: 'audit_logs',
  },
];

export function useDynamicNavigation() {
  const { canAccess: rbacCanAccess } = useRBAC();

  const salesItems = useMemo(() => {
    return SALES_MODULES.map((item) => ({
      ...item,
      // Check permission: first try permission system, then fall back to RBAC
      allowed: true, // Will be filtered by the component
    })).filter((item) => {
      // Use RBAC for now as fallback
      return rbacCanAccess(item.module, item.feature);
    });
  }, [rbacCanAccess]);

  const teamItems = useMemo(() => {
    return TEAM_MODULES.map((item) => ({
      ...item,
      // Check permission: first try permission system, then fall back to RBAC
      allowed: true, // Will be filtered by the component
    })).filter((item) => {
      // Use RBAC for now as fallback
      return rbacCanAccess(item.module, item.feature);
    });
  }, [rbacCanAccess]);

  return { salesItems, teamItems };
}

// Returns navigation config with proper structure
export function getNavigationConfig(
  canAccess: (module: string, feature: string) => boolean,
) {
  const salesItems = SALES_MODULES.filter((item) =>
    canAccess(item.module, item.feature),
  ).map((item) => ({
    label: item.label,
    path: item.path,
    Icon: item.Icon,
    end: true,
  }));

  const teamItems = TEAM_MODULES.filter((item) =>
    canAccess(item.module, item.feature),
  ).map((item) => ({
    label: item.label,
    path: item.path,
    Icon: item.Icon,
    end: true,
  }));

  return {
    salesItems,
    teamItems,
    hasSalesItems: salesItems.length > 0,
    hasTeamItems: teamItems.length > 0,
  };
}

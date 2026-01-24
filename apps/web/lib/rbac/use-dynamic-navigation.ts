'use client';

import { useMemo } from 'react';
import {
  Users,
  Briefcase,
  User,
  Activity,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import pathsConfig from '~/config/paths.config';

interface NavItem {
  label: string;
  path: string;
  Icon: React.ComponentType<{ className?: string }>;
  feature: string;
}

// Sales Module Features
const SALES_MODULES: NavItem[] = [
  {
    label: 'Leads',
    path: pathsConfig.app.leads,
    Icon: Users,
    feature: 'view',
  },
  {
    label: 'Contacts',
    path: pathsConfig.app.contacts,
    Icon: User,
    feature: 'view',
  },
  {
    label: 'Accounts',
    path: pathsConfig.app.accounts,
    Icon: Briefcase,
    feature: 'view',
  },
  {
    label: 'Opportunities',
    path: pathsConfig.app.opportunities,
    Icon: BarChart3,
    feature: 'view',
  },
];

// Team Module Features
const TEAM_MODULES: NavItem[] = [
  {
    label: 'Team Members',
    path: pathsConfig.app.teamMembers,
    Icon: Users,
    feature: 'view',
  },
  {
    label: 'Roles',
    path: pathsConfig.app.roles,
    Icon: ShieldCheck,
    feature: 'view',
  },
];

export function useDynamicNavigation() {
  const { canAccess } = useRBAC();

  const salesItems = useMemo(() => {
    return SALES_MODULES.filter((item) => canAccess(item.feature));
  }, [canAccess]);

  const teamItems = useMemo(() => {
    return TEAM_MODULES.filter((item) => canAccess(item.feature));
  }, [canAccess]);

  return { salesItems, teamItems };
}

// Returns navigation config with proper structure
export function getNavigationConfig(canAccess: (feature: string) => boolean) {
  const salesItems = SALES_MODULES.filter((item) => canAccess(item.feature)).map(
    (item) => ({
      label: item.label,
      path: item.path,
      Icon: item.Icon,
      end: true,
    })
  );

  const teamItems = TEAM_MODULES.filter((item) => canAccess(item.feature)).map(
    (item) => ({
      label: item.label,
      path: item.path,
      Icon: item.Icon,
      end: true,
    })
  );

  return {
    salesItems,
    teamItems,
    hasSalesItems: salesItems.length > 0,
    hasTeamItems: teamItems.length > 0,
  };
}

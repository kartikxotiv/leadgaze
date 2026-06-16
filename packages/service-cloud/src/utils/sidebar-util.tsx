'use client';

import type React from 'react';

import {
  Activity,
  BarChart3,
  Inbox,
  Settings,
  Ticket,
  Users,
} from 'lucide-react';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  type ServiceCloudCanAccess,
  type ServiceCloudFeatureKey,
  type ServiceCloudModuleKey,
  canAccessServiceCloudFeature,
  canAccessServiceCloudSettings,
} from './permission-util';

type ServiceCloudRoute = {
  label: string;
  path: string;
  Icon: React.ReactNode;
  moduleKey: ServiceCloudModuleKey;
  featureKey: ServiceCloudFeatureKey;
  end?: boolean; // optional flag for exact matching
};

const serviceCloudRouteChildren: ServiceCloudRoute[] = [
  {
    end: true,
    label: 'Overview',
    path: '/home/services',
    Icon: <Activity className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.dashboard,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    end: true,
    label: 'Tickets',
    path: '/home/services/tickets',
    Icon: <Ticket className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.tickets,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    end: true,
    label: 'Customers',
    path: '/home/services/customers',
    Icon: <Users className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.customers,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    end: true,
    label: 'Inboxes',
    path: '/home/services/inboxes',
    Icon: <Inbox className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.inboxes,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.manageInbox,
  },
  {
    end: true,
    label: 'Reports',
    path: '/home/services/reports',
    Icon: <BarChart3 className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.reports,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    end: true,
    label: 'Settings',
    path: '/home/services/settings',
    Icon: <Settings className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.settings,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.manageStatuses,
  },
];

export function getServiceCloudRoutesForPermissions(
  canAccess?: ServiceCloudCanAccess,
) {
  const children = serviceCloudRouteChildren
    .filter((item) => {
      if (item.moduleKey === SERVICE_CLOUD_MODULE_KEYS.settings) {
        return canAccessServiceCloudSettings(canAccess);
      }

      return canAccessServiceCloudFeature(
        canAccess,
        item.moduleKey,
        item.featureKey,
      );
    })
    .map(({ moduleKey, featureKey, ...item }) => item);

  return [
    {
      label: 'Service Cloud',
      children,
    },
  ];
}

export default [
  {
    label: 'Service Cloud',
    children: serviceCloudRouteChildren.map(
      ({ moduleKey, featureKey, ...item }) => item,
    ),
  },
];

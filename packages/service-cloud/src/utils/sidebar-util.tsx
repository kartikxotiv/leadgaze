'use client';

import type React from 'react';

import {
  Activity,
  BarChart3,
  Clock3,
  Inbox,
  Settings,
  Tags,
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
} from './permission-util';

type ServiceCloudRoute = {
  label: string;
  path: string;
  Icon: React.ReactNode;
  moduleKey: ServiceCloudModuleKey;
  featureKey: ServiceCloudFeatureKey;
};

const serviceCloudRouteChildren: ServiceCloudRoute[] = [
  {
    label: 'Overview',
    path: '/home/services',
    Icon: <Activity className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.dashboard,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    label: 'Tickets',
    path: '/home/services/tickets',
    Icon: <Ticket className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.tickets,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    label: 'Customers',
    path: '/home/services/customers',
    Icon: <Users className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.customers,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    label: 'Inboxes',
    path: '/home/services/inboxes',
    Icon: <Inbox className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.inboxes,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    label: 'Teams',
    path: '/home/services/teams',
    Icon: <Tags className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.teams,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    label: 'Time',
    path: '/home/services/time',
    Icon: <Clock3 className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.timeTracking,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    label: 'Reports',
    path: '/home/services/reports',
    Icon: <BarChart3 className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.reports,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.view,
  },
  {
    label: 'Settings',
    path: '/home/services/settings',
    Icon: <Settings className="h-4 w-4" />,
    moduleKey: SERVICE_CLOUD_MODULE_KEYS.settings,
    featureKey: SERVICE_CLOUD_FEATURE_KEYS.manageStatuses,
  },
];

export function getServiceCloudRoutesForPermissions(canAccess?: ServiceCloudCanAccess) {
  const children = serviceCloudRouteChildren
    .filter((item) =>
      canAccessServiceCloudFeature(canAccess, item.moduleKey, item.featureKey),
    )
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
    children: serviceCloudRouteChildren.map(({ moduleKey, featureKey, ...item }) => item),
  },
];

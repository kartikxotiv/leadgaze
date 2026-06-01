'use client';

import type React from 'react';

import {
  Activity,
  Building2,
  Settings,
  TrendingUp,
  Users2,
} from 'lucide-react';

import {
  FUNDRAISING_FEATURE_KEYS,
  FUNDRAISING_MODULE_KEYS,
  type FundraisingCanAccess,
  type FundraisingFeatureKey,
  type FundraisingModuleKey,
  canAccessFundraisingFeature,
} from './permission-util';

type FundraiseRoute = {
  label: string;
  path: string;
  Icon: React.ReactNode;
  moduleKey: FundraisingModuleKey;
  featureKey: FundraisingFeatureKey;
};

const fundraiseRouteChildren: FundraiseRoute[] = [
  {
    label: 'Overview',
    path: '/home/funds',
    Icon: <Activity className="h-4 w-4" />,
    moduleKey: FUNDRAISING_MODULE_KEYS.pipeline,
    featureKey: FUNDRAISING_FEATURE_KEYS.view,
  },
  {
    label: 'Rounds',
    path: '/home/funds/rounds',
    Icon: <TrendingUp className="h-4 w-4" />,
    moduleKey: FUNDRAISING_MODULE_KEYS.rounds,
    featureKey: FUNDRAISING_FEATURE_KEYS.view,
  },
  {
    label: 'Investors',
    path: '/home/funds/investors',
    Icon: <Building2 className="h-4 w-4" />,
    moduleKey: FUNDRAISING_MODULE_KEYS.investors,
    featureKey: FUNDRAISING_FEATURE_KEYS.view,
  },
  {
    label: 'Deals',
    path: '/home/funds/pipeline',
    Icon: <Users2 className="h-4 w-4" />,
    moduleKey: FUNDRAISING_MODULE_KEYS.pipeline,
    featureKey: FUNDRAISING_FEATURE_KEYS.view,
  },
  // {
  //     label: 'Activities',
  //     path: '/home/funds/activities',
  //     Icon: <Activity className="h-4 w-4" />,
  //     moduleKey: FUNDRAISING_MODULE_KEYS.pipeline,
  //     featureKey: FUNDRAISING_FEATURE_KEYS.view,
  // },
  {
    label: 'Settings',
    path: '/home/funds/settings',
    Icon: <Settings className="h-4 w-4" />,
    moduleKey: FUNDRAISING_MODULE_KEYS.pipeline,
    featureKey: FUNDRAISING_FEATURE_KEYS.manageStages,
  },
];

export function getFundraiseRoutesForPermissions(
  canAccess?: FundraisingCanAccess,
) {
  const children = fundraiseRouteChildren
    .filter((item) =>
      canAccessFundraisingFeature(canAccess, item.moduleKey, item.featureKey),
    )
    .map(({ moduleKey, featureKey, ...item }) => item);

  return [
    {
      label: 'Fundraising',
      children,
    },
  ];
}

const fundraiseRoutes = [
  {
    label: 'Fundraising',
    children: fundraiseRouteChildren.map(
      ({ moduleKey, featureKey, ...item }) => item,
    ),
  },
];

export default fundraiseRoutes;

'use client';

import type React from 'react';

import {
  Boxes,
  Building2,
  ClipboardList,
  FileBarChart2,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Warehouse,
} from 'lucide-react';

import {
  INVENTORY_FEATURE_KEYS,
  INVENTORY_MODULE_KEYS,
  type InventoryCanAccess,
  type InventoryFeatureKey,
  type InventoryModuleKey,
  canAccessInventoryFeature,
} from './permission-util';

type InventoryRoute = {
  label: string;
  path: string;
  Icon: React.ReactNode;
  moduleKey: InventoryModuleKey;
  featureKey: InventoryFeatureKey;
};

const inventoryRouteChildren: InventoryRoute[] = [
  {
    label: 'Overview',
    path: '/home/inventory',
    Icon: <LayoutDashboard className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.inventory,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Products',
    path: '/home/inventory/products',
    Icon: <Package className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.products,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Warehouses',
    path: '/home/inventory/warehouses',
    Icon: <Warehouse className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.warehouses,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Vendors',
    path: '/home/inventory/vendors',
    Icon: <Building2 className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.purchases,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Customers',
    path: '/home/inventory/customers',
    Icon: <ShoppingCart className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.customers,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Purchases',
    path: '/home/inventory/purchases',
    Icon: <ClipboardList className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.purchases,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Stock',
    path: '/home/inventory/stock',
    Icon: <Boxes className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.stock,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Transfers',
    path: '/home/inventory/transfers',
    Icon: <Truck className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.stock,
    featureKey: INVENTORY_FEATURE_KEYS.transfer,
  },
  {
    label: 'Audits',
    path: '/home/inventory/audits',
    Icon: <ShieldCheck className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.audits,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Reports',
    path: '/home/inventory/reports',
    Icon: <FileBarChart2 className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.reports,
    featureKey: INVENTORY_FEATURE_KEYS.view,
  },
  {
    label: 'Settings',
    path: '/home/inventory/settings',
    Icon: <Settings className="h-4 w-4" />,
    moduleKey: INVENTORY_MODULE_KEYS.inventory,
    featureKey: INVENTORY_FEATURE_KEYS.manage,
  },
];

export function getInventoryRoutesForPermissions(
  canAccess?: InventoryCanAccess,
) {
  const children = inventoryRouteChildren
    .filter((item) =>
      canAccessInventoryFeature(canAccess, item.moduleKey, item.featureKey),
    )
    .map(({ moduleKey, featureKey, ...item }) => item);

  return [
    {
      label: 'Inventory',
      children,
    },
  ];
}

const inventoryRoutes = [
  {
    label: 'Inventory',
    children: inventoryRouteChildren.map(
      ({ moduleKey, featureKey, ...item }) => item,
    ),
  },
];

export default inventoryRoutes;

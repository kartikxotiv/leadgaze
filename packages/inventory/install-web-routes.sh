#!/usr/bin/env bash
set -euo pipefail

# Run this script from apps/web:
#   ../../packages/inventory/install-web-routes.sh

if [ ! -d "app" ] || [ ! -f "package.json" ]; then
  echo "This script must be run from the web app directory, for example apps/web."
  exit 1
fi

mkdir -p \
  app/api/inventory/dashboard \
  app/api/inventory/products \
  app/api/inventory/warehouses \
  app/api/inventory/vendors \
  app/api/inventory/customers \
  app/api/inventory/purchases \
  app/api/inventory/stock \
  app/api/inventory/transfers \
  app/api/inventory/audits \
  app/api/inventory/reports \
  app/api/inventory/settings \
  app/home/inventory \
  app/home/inventory/products \
  app/home/inventory/warehouses \
  app/home/inventory/vendors \
  app/home/inventory/customers \
  app/home/inventory/purchases \
  app/home/inventory/stock \
  app/home/inventory/transfers \
  app/home/inventory/audits \
  app/home/inventory/reports \
  app/home/inventory/settings

write_file() {
  local file="$1"
  shift
  if [ -f "$file" ]; then
    echo "skip $file"
    return
  fi
  printf "%s\n" "$@" > "$file"
  echo "create $file"
}

# API Routes
write_file app/api/inventory/dashboard/route.ts \
  "import { getDashboardController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getDashboardController, { auth: false });"

write_file app/api/inventory/products/route.ts \
  "import { getProductsController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getProductsController, { auth: false });"

write_file app/api/inventory/warehouses/route.ts \
  "import { getWarehousesController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getWarehousesController, { auth: false });"

write_file app/api/inventory/vendors/route.ts \
  "import { getVendorsController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getVendorsController, { auth: false });"

write_file app/api/inventory/customers/route.ts \
  "import { getCustomersController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getCustomersController, { auth: false });"

write_file app/api/inventory/purchases/route.ts \
  "import { getPurchasesController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getPurchasesController, { auth: false });"

write_file app/api/inventory/stock/route.ts \
  "import { getStockController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getStockController, { auth: false });"

write_file app/api/inventory/transfers/route.ts \
  "import { getTransfersController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getTransfersController, { auth: false });"

write_file app/api/inventory/audits/route.ts \
  "import { getAuditsController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getAuditsController, { auth: false });"

write_file app/api/inventory/reports/route.ts \
  "import { getReportsController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getReportsController, { auth: false });"

write_file app/api/inventory/settings/route.ts \
  "import { getSettingsController } from '@kit/inventory';" \
  "import { enhanceRouteHandler } from '@kit/next/routes';" \
  "" \
  "export const GET = enhanceRouteHandler(getSettingsController, { auth: false });"

# Page Routes
write_file app/home/inventory/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryDashboardPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryDashboardRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryDashboardPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/products/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryProductsPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryProductsRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryProductsPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/warehouses/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryWarehousesPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryWarehousesRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryWarehousesPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/vendors/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryVendorsPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryVendorsRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryVendorsPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/customers/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryCustomersPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryCustomersRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryCustomersPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/purchases/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryPurchasesPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryPurchasesRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryPurchasesPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/stock/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryStockPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryStockRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryStockPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/transfers/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryTransfersPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryTransfersRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryTransfersPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/audits/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryAuditsPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryAuditsRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryAuditsPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/reports/page.tsx \
  "'use client';" \
  "" \
  "import { InventoryReportsPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventoryReportsRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventoryReportsPage workspaceId={workspaceId} />;" \
  "}"

write_file app/home/inventory/settings/page.tsx \
  "'use client';" \
  "" \
  "import { InventorySettingsPage } from '@kit/inventory';" \
  "import { useRBAC } from '~/lib/rbac/rbac-provider';" \
  "" \
  "export default function InventorySettingsRoute() {" \
  "  const { currentWorkspace } = useRBAC();" \
  "  const workspaceId = currentWorkspace?.id;" \
  "  if (!workspaceId) return <div>No workspace selected</div>;" \
  "  return <InventorySettingsPage workspaceId={workspaceId} />;" \
  "}"

echo "Inventory web routes installed."

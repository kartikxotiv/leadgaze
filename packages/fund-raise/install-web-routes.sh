#!/usr/bin/env bash
set -euo pipefail

# Run this script from apps/web:
#   ../../packages/fund-raise/install-web-routes.sh

if [ ! -d "app" ] || [ ! -f "package.json" ]; then
  echo "This script must be run from the web app directory, for example apps/web."
  exit 1
fi

mkdir -p \
  app/api/funds/commitments \
  app/api/funds/deals \
  app/api/funds/investor-contacts \
  app/api/funds/investors \
  app/api/funds/pipeline-stages \
  app/api/funds/rounds \
  app/home/fund/activities \
  app/home/fund/deals/[id] \
  app/home/fund/investors/[id] \
  app/home/fund/investors \
  app/home/fund/pipeline \
  app/home/fund/rounds/[id] \
  app/home/fund/rounds \
  app/home/fund/settings

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

write_file app/api/funds/investors/route.ts \
"import { createInvestorController, deleteInvestorController, getInvestorsController, updateInvestorController } from '@kit/fund-raise';" \
"import { enhanceRouteHandler } from '@kit/next/routes';" \
"" \
"export const GET = enhanceRouteHandler(getInvestorsController, { auth: false });" \
"export const POST = enhanceRouteHandler(createInvestorController, { auth: false });" \
"export const PATCH = enhanceRouteHandler(updateInvestorController, { auth: false });" \
"export const DELETE = enhanceRouteHandler(deleteInvestorController, { auth: false });"

write_file app/api/funds/rounds/route.ts \
"import { createRoundController, deleteRoundController, getRoundsController, updateRoundController } from '@kit/fund-raise';" \
"import { enhanceRouteHandler } from '@kit/next/routes';" \
"" \
"export const GET = enhanceRouteHandler(getRoundsController, { auth: false });" \
"export const POST = enhanceRouteHandler(createRoundController, { auth: false });" \
"export const PATCH = enhanceRouteHandler(updateRoundController, { auth: false });" \
"export const DELETE = enhanceRouteHandler(deleteRoundController, { auth: false });"

write_file app/api/funds/deals/route.ts \
"import { createDealController, deleteDealController, getDealsController, updateDealController } from '@kit/fund-raise';" \
"import { enhanceRouteHandler } from '@kit/next/routes';" \
"" \
"export const GET = enhanceRouteHandler(getDealsController, { auth: false });" \
"export const POST = enhanceRouteHandler(createDealController, { auth: false });" \
"export const PATCH = enhanceRouteHandler(updateDealController, { auth: false });" \
"export const DELETE = enhanceRouteHandler(deleteDealController, { auth: false });"

write_file app/api/funds/investor-contacts/route.ts \
"import { createInvestorContactController, deleteInvestorContactController, getInvestorContactsController, updateInvestorContactController } from '@kit/fund-raise';" \
"import { enhanceRouteHandler } from '@kit/next/routes';" \
"" \
"export const GET = enhanceRouteHandler(getInvestorContactsController, { auth: false });" \
"export const POST = enhanceRouteHandler(createInvestorContactController, { auth: false });" \
"export const PATCH = enhanceRouteHandler(updateInvestorContactController, { auth: false });" \
"export const DELETE = enhanceRouteHandler(deleteInvestorContactController, { auth: false });"

write_file app/api/funds/commitments/route.ts \
"import { createCommitmentController, deleteCommitmentController, getCommitmentsController, updateCommitmentController } from '@kit/fund-raise';" \
"import { enhanceRouteHandler } from '@kit/next/routes';" \
"" \
"export const GET = enhanceRouteHandler(getCommitmentsController, { auth: false });" \
"export const POST = enhanceRouteHandler(createCommitmentController, { auth: false });" \
"export const PATCH = enhanceRouteHandler(updateCommitmentController, { auth: false });" \
"export const DELETE = enhanceRouteHandler(deleteCommitmentController, { auth: false });"

write_file app/api/funds/pipeline-stages/route.ts \
"import { createPipelineStageController, deletePipelineStageController, getPipelineStagesController, updatePipelineStageController } from '@kit/fund-raise';" \
"import { enhanceRouteHandler } from '@kit/next/routes';" \
"" \
"export const GET = enhanceRouteHandler(getPipelineStagesController, { auth: false });" \
"export const POST = enhanceRouteHandler(createPipelineStageController, { auth: false });" \
"export const PATCH = enhanceRouteHandler(updatePipelineStageController, { auth: false });" \
"export const DELETE = enhanceRouteHandler(deletePipelineStageController, { auth: false });"

write_file app/home/fund/page.tsx \
"'use client';" \
"" \
"import { FundraisingDashboardPage } from '@kit/fund-raise';" \
"import { useRBAC } from '~/lib/rbac/rbac-provider';" \
"" \
"export default function FundingDashboardRoute() {" \
"  const { currentWorkspace } = useRBAC();" \
"  const workspaceId = currentWorkspace?.id;" \
"  if (!workspaceId) return <div>No workspace selected</div>;" \
"  return <FundraisingDashboardPage workspaceId={workspaceId} />;" \
"}"

write_file app/home/fund/investors/page.tsx \
"'use client';" \
"" \
"import { FundraisingInvestorsPage } from '@kit/fund-raise';" \
"import { useRBAC } from '~/lib/rbac/rbac-provider';" \
"" \
"export default function FundingInvestorsRoute() {" \
"  const { currentWorkspace } = useRBAC();" \
"  const workspaceId = currentWorkspace?.id;" \
"  if (!workspaceId) return <div>No workspace selected</div>;" \
"  return <FundraisingInvestorsPage workspaceId={workspaceId} />;" \
"}"

write_file app/home/fund/investors/[id]/page.tsx \
"'use client';" \
"" \
"import { FundraisingInvestorDetailsPage } from '@kit/fund-raise';" \
"import { useRBAC } from '~/lib/rbac/rbac-provider';" \
"" \
"export default function FundingInvestorDetailsRoute({ params }: { params: { id: string } }) {" \
"  const { currentWorkspace } = useRBAC();" \
"  const workspaceId = currentWorkspace?.id;" \
"  if (!workspaceId) return <div>No workspace selected</div>;" \
"  return <FundraisingInvestorDetailsPage workspaceId={workspaceId} investorId={params.id} />;" \
"}"

write_file app/home/fund/rounds/page.tsx \
"'use client';" \
"" \
"import { FundraisingRoundsPage } from '@kit/fund-raise';" \
"import { useRBAC } from '~/lib/rbac/rbac-provider';" \
"" \
"export default function FundingRoundsRoute() {" \
"  const { currentWorkspace } = useRBAC();" \
"  const workspaceId = currentWorkspace?.id;" \
"  if (!workspaceId) return <div>No workspace selected</div>;" \
"  return <FundraisingRoundsPage workspaceId={workspaceId} />;" \
"}"

write_file app/home/fund/rounds/[id]/page.tsx \
"'use client';" \
"" \
"import { FundraisingRoundDetailsPage } from '@kit/fund-raise';" \
"import { useRBAC } from '~/lib/rbac/rbac-provider';" \
"" \
"export default function FundingRoundDetailsRoute({ params }: { params: { id: string } }) {" \
"  const { currentWorkspace } = useRBAC();" \
"  const workspaceId = currentWorkspace?.id;" \
"  if (!workspaceId) return <div>No workspace selected</div>;" \
"  return <FundraisingRoundDetailsPage workspaceId={workspaceId} roundId={params.id} />;" \
"}"

write_file app/home/fund/pipeline/page.tsx \
"'use client';" \
"" \
"import { FundraisingPipelinePage } from '@kit/fund-raise';" \
"import { useRBAC } from '~/lib/rbac/rbac-provider';" \
"" \
"export default function FundingPipelineRoute() {" \
"  const { currentWorkspace } = useRBAC();" \
"  const workspaceId = currentWorkspace?.id;" \
"  if (!workspaceId) return <div>No workspace selected</div>;" \
"  return <FundraisingPipelinePage workspaceId={workspaceId} />;" \
"}"

write_file app/home/fund/deals/[id]/page.tsx \
"'use client';" \
"" \
"import { FundraisingDealDetailsPage } from '@kit/fund-raise';" \
"import { useRBAC } from '~/lib/rbac/rbac-provider';" \
"" \
"export default function FundingDealDetailsRoute({ params }: { params: { id: string } }) {" \
"  const { currentWorkspace } = useRBAC();" \
"  const workspaceId = currentWorkspace?.id;" \
"  if (!workspaceId) return <div>No workspace selected</div>;" \
"  return <FundraisingDealDetailsPage workspaceId={workspaceId} dealId={params.id} />;" \
"}"

write_file app/home/fund/activities/page.tsx \
"'use client';" \
"" \
"import { FundraisingActivitiesPage } from '@kit/fund-raise';" \
"" \
"export default function FundingActivitiesRoute() {" \
"  return <FundraisingActivitiesPage />;" \
"}"

write_file app/home/fund/settings/page.tsx \
"'use client';" \
"" \
"import { FundraisingSettingsPage } from '@kit/fund-raise';" \
"import { useRBAC } from '~/lib/rbac/rbac-provider';" \
"" \
"export default function FundingSettingsRoute() {" \
"  const { currentWorkspace } = useRBAC();" \
"  const workspaceId = currentWorkspace?.id;" \
"  if (!workspaceId) return <div>No workspace selected</div>;" \
"  return <FundraisingSettingsPage workspaceId={workspaceId} />;" \
"}"

echo "Fundraising web routes installed."

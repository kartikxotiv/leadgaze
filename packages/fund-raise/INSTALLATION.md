# Fund Raise Package Installation

The fund-raise package keeps its reusable UI, API controllers, services, and sidebar config inside `packages/fund-raise`. The web app only needs thin route files that import those package exports.

## 1. Install Web Routes

Run this from `apps/web`:

```bash
../../packages/fund-raise/install-web-routes.sh
```

The script creates:

```txt
app/api/funds/*
app/home/fund/*
```

It is idempotent. Existing files are skipped so local customizations are not overwritten.

## 2. Database Migration

Run the fundraising migration before opening the module:

```txt
apps/web/supabase/migrations/fund-raise/20260530120000_create_fundraising_tables.sql
```

This creates the `fundraising` schema and the main tables:

```txt
fundraising.pipeline_stages
fundraising.investors
fundraising.investor_contacts
fundraising.rounds
fundraising.deals
fundraising.commitments
```

The package APIs expect this schema to exist.

## 3. Workspace ID Requirement

All main UI pages need a `workspaceId` prop. In the web app we resolve it from RBAC:

```tsx
'use client';

import { FundraisingDashboardPage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function FundingDashboardRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  if (!workspaceId) {
    return <div>No workspace selected</div>;
  }

  return <FundraisingDashboardPage workspaceId={workspaceId} />;
}
```

This applies to:

```txt
FundraisingDashboardPage
FundraisingInvestorsPage
FundraisingInvestorDetailsPage
FundraisingRoundsPage
FundraisingRoundDetailsPage
FundraisingPipelinePage
FundraisingDealDetailsPage
FundraisingSettingsPage
```

## 4. Sidebar Items

The package exports sidebar config from:

```ts
import { fundraiseRoutes } from '@kit/fund-raise';
```

The current routes are:

```txt
/home/fund
/home/fund/investors
/home/fund/rounds
/home/fund/pipeline
/home/fund/activities
/home/fund/settings
```

Use this list in the web sidebar when the user is inside the Fund Raising module.

## 5. API Routes Created By The Script

The installer creates web API route files that wrap package controllers with `enhanceRouteHandler`:

```txt
/api/funds/investors
/api/funds/investor-contacts
/api/funds/rounds
/api/funds/deals
/api/funds/commitments
/api/funds/pipeline-stages
```

Each resource supports:

```txt
GET
POST
PATCH
DELETE
```

## 6. Package Exports

Main import:

```ts
import {
  FundraisingDashboardPage,
  FundraisingInvestorsPage,
  FundraisingRoundsPage,
  FundraisingPipelinePage,
  FundraisingSettingsPage,
  fundraiseRoutes,
} from '@kit/fund-raise';
```

API controllers are exported from:

```ts
import { getInvestorsController } from '@kit/fund-raise';
```

Services are exported from:

```ts
import { getInvestorsService } from '@kit/fund-raise';
```

## 7. Notes On Core Modules

The module is designed to integrate with core services using these entity mappings:

```txt
fundraising_investor
fundraising_round
fundraising_deal
```

Example:

```txt
entity_type = fundraising_deal
entity_id = deal_id
```

Core modules such as Notes, Meetings, Documents, Emails, Activities, Reminders, and Notifications should use those mappings.

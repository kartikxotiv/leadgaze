'use client';

import React from 'react';
import { FundraisingActivitiesPage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function FundingActivitiesPage() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  if (!workspaceId) {
    return <div>No workspace selected</div>;
  }

  return <FundraisingActivitiesPage workspaceId={workspaceId} />;
}

'use client';

import React from 'react';
import { FundraisingDealDetailsPage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function DealDetailsRoute({ params }: { params: { id: string } }) {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <FundraisingDealDetailsPage workspaceId={workspaceId} dealId={params.id} />;
}

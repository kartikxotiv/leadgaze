'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { FundraisingDealDetailsPage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function DealDetailsRoute() {
  const params = useParams<{ id: string }>();
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <FundraisingDealDetailsPage workspaceId={workspaceId} dealId={params.id} />;
}

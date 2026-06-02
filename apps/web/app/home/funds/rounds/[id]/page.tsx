'use client';

import React from 'react';
import { FundraisingRoundDetailsPage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function RoundDetailsRoute({ params }: { params: { id: string } }) {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <FundraisingRoundDetailsPage workspaceId={workspaceId} roundId={params.id} />;
}

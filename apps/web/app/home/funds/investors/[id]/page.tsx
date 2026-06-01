'use client';

import React from 'react';
import { FundraisingInvestorDetailsPage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function InvestorDetailsRoute({ params }: { params: { id: string } }) {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <FundraisingInvestorDetailsPage workspaceId={workspaceId} investorId={params.id} />;
}

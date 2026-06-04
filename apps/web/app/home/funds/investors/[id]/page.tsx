'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { FundraisingInvestorDetailsPage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function InvestorDetailsRoute() {
  const params = useParams<{ id: string }>();
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <FundraisingInvestorDetailsPage workspaceId={workspaceId} investorId={params.id} />;
}

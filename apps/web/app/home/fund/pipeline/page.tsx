'use client';

import React from 'react';
import { FundraisingPipelinePage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function FundingPipelinePage() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  if (!workspaceId) {
    return <div>No workspace selected</div>;
  }

  return <FundraisingPipelinePage workspaceId={workspaceId} />;
}

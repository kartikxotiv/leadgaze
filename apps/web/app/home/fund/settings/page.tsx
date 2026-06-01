'use client';

import React from 'react';
import { FundraisingSettingsPage } from '@kit/fund-raise';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function FundingSettingsPage() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  if (!workspaceId) {
    return <div>No workspace selected</div>;
  }

  return <FundraisingSettingsPage workspaceId={workspaceId} />;
}

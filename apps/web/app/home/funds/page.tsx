'use client'

import React from 'react'
import { FundraisingDashboardPage } from '@kit/fund-raise'
import { useRBAC } from '~/lib/rbac/rbac-provider';

const DemoPage = () => {
    const { currentWorkspace } = useRBAC();
    const workspaceId = currentWorkspace?.id;

    if (!workspaceId) {
        return <div>No workspace selected</div>;
    }

    return (
        <FundraisingDashboardPage workspaceId={workspaceId} />
    )
}

export default DemoPage

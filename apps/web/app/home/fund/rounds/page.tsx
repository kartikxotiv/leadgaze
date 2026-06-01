'use client'
import React from 'react'
import { FundraisingRoundsPage } from '@kit/fund-raise'
import { useRBAC } from '~/lib/rbac/rbac-provider';

const FundingRoundsPage = () => {
    const { currentWorkspace } = useRBAC();
    const workspaceId = currentWorkspace?.id;

    if (!workspaceId) {
        return <div>No workspace selected</div>;
    }

    return (
        <FundraisingRoundsPage workspaceId={workspaceId} />
    )
}

export default FundingRoundsPage
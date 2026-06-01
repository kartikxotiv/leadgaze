'use client'

import React from 'react'
import { FundraisingDealsPage } from '@kit/fund-raise'
import { useRBAC } from '~/lib/rbac/rbac-provider';

const FundingDealsPage = () => {
    const { currentWorkspace } = useRBAC();
    const workspaceId = currentWorkspace?.id;

    if (!workspaceId) {
        return <div>No workspace selected</div>;
    }


    return (
        <FundraisingDealsPage workspaceId={workspaceId} />
    )
}

export default FundingDealsPage

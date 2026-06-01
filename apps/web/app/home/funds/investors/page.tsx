'use client'
import React from 'react'
import { FundraisingInvestorsPage } from '@kit/fund-raise'
import { useRBAC } from '~/lib/rbac/rbac-provider';

const FundingInvestorsPage = () => {
    const { currentWorkspace } = useRBAC();
    const workspaceId = currentWorkspace?.id;

    if (!workspaceId) {
        return <div>No workspace selected</div>;
    }


    return (
        <FundraisingInvestorsPage workspaceId={workspaceId} />
    )
}

export default FundingInvestorsPage
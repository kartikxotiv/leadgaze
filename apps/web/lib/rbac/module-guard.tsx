'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@kit/ui/button';
import { useRBAC } from './rbac-provider';
import pathsConfig from '~/config/paths.config';

interface ModuleGuardProps {
    children: ReactNode;
    module: string;
    feature?: string;
    fallback?: ReactNode;
}

export function ModuleGuard({
    children,
    module,
    feature = 'view',
    fallback,
}: ModuleGuardProps) {
    const { canAccess, isLoading, currentWorkspace } = useRBAC();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        if (!isLoading && currentWorkspace) {
            const authorized = canAccess(module, feature);
            setIsAuthorized(authorized);
        }
    }, [isLoading, currentWorkspace, module, feature, canAccess]);

    // While loading or before check is complete
    if (isLoading || isAuthorized === null) {
        return null; // Or a loading spinner
    }

    if (!isAuthorized) {
        if (fallback) return <>{fallback}</>;

        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <div className="bg-destructive/10 p-4 rounded-full mb-4 text-destructive">
                    <ShieldAlert className="h-12 w-12" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                    You don't have the required permissions to access the {module} module.
                    Please contact your workspace administrator if you believe this is an error.
                </p>
                <Button onClick={() => router.push(pathsConfig.app.home)}>
                    Return to Dashboard
                </Button>
            </div>
        );
    }

    return <>{children}</>;
}

'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { LogOut, Menu } from 'lucide-react';

import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Trans } from '@kit/ui/trans';

import { navigationConfig } from '~/config/navigation.config';
import { getMyRbacSnapshotService } from '~/services/rbac.service';
import { canAccessModule } from '~/utils/rbac-client';

/**
 * Mobile navigation for the home page
 * @constructor
 */
export function HomeMobileNavigation() {
  const signOut = useSignOut();
  const rbacQuery = useQuery({
    queryKey: ['rbac-me'],
    queryFn: getMyRbacSnapshotService,
  });

  const snapshot = rbacQuery.data?.data ?? null;

  const moduleKeyByLabel: Record<string, string> = {
    Employees: 'employees',
    Departments: 'departments',
    Documents: 'documents',
    Attendance: 'attendance',
    Leave: 'leave',
    Payroll: 'payroll',
    Compliance: 'compliance',
    'Self Service': 'self_service',
    'Support System': 'support_system',
    Performance: 'performance',
    Recruitment: 'recruitment',
    Separation: 'separation',
    Reports: 'reports',
  };

  const Links = navigationConfig.routes.map((item, index) => {
    if ('children' in item) {
      return item.children.map((child) => {
        const moduleKey = moduleKeyByLabel[child.label];
        if (moduleKey && snapshot && !canAccessModule(snapshot, moduleKey)) {
          return null;
        }

        return (
          <DropdownLink
            key={child.path}
            Icon={child.Icon}
            path={child.path}
            label={child.label}
          />
        );
      });
    }

    if ('divider' in item) {
      return <DropdownMenuSeparator key={index} />;
    }
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Menu className={'h-9'} />
      </DropdownMenuTrigger>

      <DropdownMenuContent sideOffset={10} className={'w-screen rounded-none'}>
        <DropdownMenuGroup>
          {Links.flat().filter(Boolean) as Array<React.ReactNode>}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <SignOutDropdownItem onSignOut={() => signOut.mutateAsync()} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DropdownLink(
  props: React.PropsWithChildren<{
    path: string;
    label: string;
    Icon: React.ReactNode;
  }>,
) {
  return (
    <DropdownMenuItem asChild key={props.path}>
      <Link
        href={props.path}
        className={'flex h-12 w-full items-center space-x-4'}
      >
        {props.Icon}

        <span>
          <Trans i18nKey={props.label} defaults={props.label} />
        </span>
      </Link>
    </DropdownMenuItem>
  );
}

function SignOutDropdownItem(
  props: React.PropsWithChildren<{
    onSignOut: () => unknown;
  }>,
) {
  return (
    <DropdownMenuItem
      className={'flex h-12 w-full items-center space-x-4'}
      onClick={props.onSignOut}
    >
      <LogOut className={'h-6'} />

      <span>
        <Trans i18nKey={'common:signOut'} defaults={'Sign out'} />
      </span>
    </DropdownMenuItem>
  );
}

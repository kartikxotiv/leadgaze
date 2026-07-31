'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';

import { LogOut, Menu } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';

export interface MobileNavbarItem {
  label: string;
  path?: string;
  Icon?: ReactNode;
  children?: MobileNavbarItem[];
  divider?: boolean;
}

export interface MobileNavbarProps {
  routes?: MobileNavbarItem[];
  onSignOut?: () => void | Promise<unknown>;
  signOutLabel?: string;
  className?: string;
}

export function MobileNavbar({
  routes = [],
  onSignOut,
  signOutLabel = 'Sign out',
  className,
}: MobileNavbarProps) {
  const Links = routes.map((item, index) => {
    if ('children' in item && item.children) {
      return item.children.map((child) => (
        <DropdownLink
          key={child.path ?? index.toString()}
          Icon={child.Icon}
          path={child.path ?? '#'}
          label={child.label}
        />
      ));
    }

    if ('divider' in item && item.divider) {
      return <DropdownMenuSeparator key={index} />;
    }

    if (item.path) {
      return (
        <DropdownLink
          key={item.path}
          Icon={item.Icon}
          path={item.path}
          label={item.label}
        />
      );
    }

    return null;
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className}>
        <Menu className="h-9 w-9" />
      </DropdownMenuTrigger>

      <DropdownMenuContent sideOffset={10} className="w-screen rounded-none">
        <DropdownMenuGroup>{Links}</DropdownMenuGroup>

        {onSignOut && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex h-12 w-full items-center space-x-4 cursor-pointer"
              onClick={onSignOut}
            >
              <LogOut className="h-6 w-6" />
              <span>{signOutLabel}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DropdownLink(props: {
  path: string;
  label: string;
  Icon?: ReactNode;
}) {
  return (
    <DropdownMenuItem asChild key={props.path}>
      <Link
        href={props.path}
        className="flex h-12 w-full items-center space-x-4"
      >
        {props.Icon}
        <span>{props.label}</span>
      </Link>
    </DropdownMenuItem>
  );
}

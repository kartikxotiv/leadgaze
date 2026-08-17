'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ChevronDown, Menu } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';
import { cn, isRouteActive } from '../../lib/utils';
import type { NavigationItem } from '../navigation-types';

export interface AppNavbarProps {
  logo?: ReactNode;
  items?: NavigationItem[];
  maxVisibleItems?: number;
  workspaceSwitcher?: ReactNode;
  moduleSwitcher?: ReactNode;
  actions?: ReactNode;
  profileDropdown?: ReactNode;
  customNavRender?: (item: NavigationItem, active: boolean) => ReactNode;
  className?: string;
}

export function AppNavbar({
  logo,
  items = [],
  maxVisibleItems = 6,
  workspaceSwitcher,
  moduleSwitcher,
  actions,
  profileDropdown,
  customNavRender,
  className,
}: AppNavbarProps) {
  const pathname = usePathname();

  const visibleItems = items.slice(0, maxVisibleItems);
  const moreItems = items.slice(maxVisibleItems);

  return (
    <div
      className={cn(
        'flex w-full flex-1 items-center justify-between',
        className,
      )}
    >
      {/* Left section: Logo, Module/Workspace Switcher & Navigation Items */}
      <div className="flex min-w-0 flex-1 items-center space-x-3 overflow-hidden md:space-x-4">
        {logo && <div className="flex shrink-0 items-center space-x-2 md:space-x-3">{logo}</div>}

        {moduleSwitcher && (
          <div className="hidden shrink-0 lg:block">{moduleSwitcher}</div>
        )}

        {workspaceSwitcher && (
          <div className="shrink-0">{workspaceSwitcher}</div>
        )}

        {/* Desktop Navigation Items */}
        {items.length > 0 && (
          <nav className="hidden items-center space-x-1 lg:flex lg:space-x-2">
            {visibleItems.map((item) => {
              const active = item.path
                ? isRouteActive(item.path, pathname, item.end ?? false)
                : false;

              if (customNavRender) {
                return (
                  <span key={item.path || item.label}>
                    {customNavRender(item, active)}
                  </span>
                );
              }

              return (
                <Link
                  key={item.path || item.label}
                  href={item.path || '#'}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 transition-colors secondary-text-small-bold 2xl:primary-text-medium',
                    active
                      ? 'bg-header-primary !text-white'
                      : '!text-blue-100 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {item.Icon && <span className="mr-1">{item.Icon}</span>}
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* More Dropdown Menu */}
            {moreItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex cursor-pointer items-center gap-1 px-3 py-1.5 text-blue-100 transition-colors hover:bg-white/10 hover:text-white secondary-text-small-bold 2xl:primary-text-medium">
                    <span>More</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="mt-1 w-48">
                  {moreItems.map((item) => (
                    <DropdownMenuItem key={item.path || item.label} asChild>
                      <Link
                        href={item.path || '#'}
                        className="w-full cursor-pointer px-3 py-1 secondary-text-small-bold 2xl:primary-text-medium"
                      >
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        )}
      </div>

      {/* Right side: Mobile Menu trigger, Custom Actions, Profile Dropdown */}
      <div className="flex shrink-0 items-center space-x-2 md:space-x-3">
        {/* Mobile Navigation Dropdown for small screens */}
        {items.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex cursor-pointer items-center justify-center rounded-md p-2 text-blue-100 transition-colors hover:bg-white/10 hover:text-white lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="mt-1 w-48">
              {items.map((item) => {
                const isActive = item.path
                  ? isRouteActive(item.path, pathname, item.end ?? false)
                  : false;
                return (
                  <DropdownMenuItem key={item.path || item.label} asChild>
                    <Link
                      href={item.path || '#'}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2',
                        isActive ? 'bg-header-primary font-semibold text-white' : '',
                      )}
                    >
                      {item.Icon}
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {actions}

        {profileDropdown && (
          <div className="shrink-0 border-l border-blue-500/20 pl-2">
            {profileDropdown}
          </div>
        )}
      </div>
    </div>
  );
}

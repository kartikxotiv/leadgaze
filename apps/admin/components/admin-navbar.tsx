'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Bell, Settings } from 'lucide-react';

import { AppNavbar } from '@kit/ui/app-navbar';
import { Badge } from '@kit/ui/badge';

import { adminNavigation } from '~/config/navigation';
import { ProfileAccountDropdownContainer } from './personal-account-dropdown-container';

function SuperAdminLogo() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 font-semibold text-white"
    >
      <Image
        src="/images/leadgaze-logo-mini.png"
        height={32}
        width={32}
        alt="leadgaze"
        className="h-8 w-auto object-contain"
        priority
      />
      <span className="text-sm font-bold tracking-tight">SuperAdmin</span>
    </Link>
  );
}

function NavbarActions() {
  return (
    <div className="flex items-center gap-1">
      {/* Notification Bell */}
      <button className="relative flex h-8 w-8 items-center justify-center rounded-md text-blue-100 transition-colors hover:bg-white/10 hover:text-white">
        <Bell className="h-4 w-4" />
        {/* Red dot badge */}
        <Badge className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] font-bold text-white leading-none border-0 hover:bg-red-500">
          2
        </Badge>
      </button>

      {/* Settings / Gear */}
      <button className="flex h-8 w-8 items-center justify-center rounded-md text-blue-100 transition-colors hover:bg-white/10 hover:text-white">
        <Settings className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AdminNavbar() {
  return (
    <AppNavbar
      logo={<SuperAdminLogo />}
      items={adminNavigation}
      actions={<NavbarActions />}
      profileDropdown={<ProfileAccountDropdownContainer showProfileName={false} />}
    />
  );
}

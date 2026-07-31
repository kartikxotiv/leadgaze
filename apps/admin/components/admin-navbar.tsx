'use client';

import Link from 'next/link';

import { Shield } from 'lucide-react';

import { AppNavbar } from '@kit/ui/app-navbar';

import { adminNavigation } from '~/config/navigation';
import { ProfileAccountDropdownContainer } from './personal-account-dropdown-container';

export function AdminNavbar() {
  const logo = (
    <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold text-white">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/20">
        <Shield className="h-4 w-4 text-white" />
      </div>
      <span className="text-sm font-semibold tracking-tight">Leadgaze Admin</span>
    </Link>
  );

  return (
    <AppNavbar
      logo={logo}
      items={adminNavigation}
      profileDropdown={<ProfileAccountDropdownContainer showProfileName={false} />}
    />
  );
}

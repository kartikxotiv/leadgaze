'use client';

import { BarChart3, LayoutDashboard, Settings, Users } from 'lucide-react';

import { AppShell } from '@kit/ui/app-shell';

import { AdminNavbar } from '~/components/admin-navbar';

export default function AdminHome() {
  return (
    <AppShell navbar={<AdminNavbar />}>
      {/* Main Content */}
      <main className="p-8 max-w-6xl mx-auto">
        {/* Welcome Banner */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-[#283BA4] to-[#3953E7] p-6 text-white">
          <h2 className="text-2xl font-semibold mb-1">Welcome to Leadgaze Admin</h2>
          <p className="text-white/75 text-sm">
            This is your platform admin panel. Build your admin features here.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: '—', icon: Users, color: 'text-status-info-text', bg: 'bg-status-info-bg' },
            { label: 'Dashboard', value: '—', icon: LayoutDashboard, color: 'text-status-success-text', bg: 'bg-status-success-bg' },
            { label: 'Analytics', value: '—', icon: BarChart3, color: 'text-status-warning-text', bg: 'bg-status-warning-bg' },
            { label: 'Settings', value: '—', icon: Settings, color: 'text-status-neutral-text', bg: 'bg-status-neutral-bg' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-white dark:bg-neutral-900 p-5 flex items-start gap-4"
            >
              <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-leadgaze-muted font-medium">{label}</p>
                <p className="text-2xl font-semibold text-leadgaze-dark dark:text-white mt-0.5">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Setup Checklist */}
        <div className="rounded-lg border border-border bg-white dark:bg-neutral-900 p-6">
          <h3 className="text-sm font-semibold text-leadgaze-dark dark:text-white mb-4">
            Setup Checklist
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Admin panel running on port 3001', done: true },
              { label: 'Shared design system & AppShell layout via @kit/ui', done: true },
              { label: 'Roboto font & Leadgaze color tokens active', done: true },
              { label: 'Same Supabase instance connected', done: true },
              { label: 'ThemeProvider (dark/light mode) active', done: true },
              { label: 'Build admin-specific pages & routes', done: false },
            ].map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done
                      ? 'bg-status-success-bg'
                      : 'border-2 border-border'
                  }`}
                >
                  {done && (
                    <svg className="h-3 w-3 text-status-success-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    done ? 'text-leadgaze-dark dark:text-white' : 'text-leadgaze-muted'
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

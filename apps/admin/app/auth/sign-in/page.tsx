import Image from 'next/image';

import { Lock, Shield, Users } from 'lucide-react';

import { SignInMethodsContainer } from '@kit/auth/sign-in';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';

export const metadata = {
  title: 'Sign In — Leadgaze Admin',
  description: 'Sign in to the Leadgaze admin portal.',
};

const paths = {
  callback: pathsConfig.auth.callback,
  home: pathsConfig.app.home,
};

interface SignInPageProps {
  searchParams: Promise<{ error?: string }>;
}

async function AdminSignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;

  return (
    <div className="fixed inset-0 z-50 grid min-h-screen overflow-y-auto bg-[var(--color-leadgaze-auth-surface)] text-slate-800 lg:grid-cols-[minmax(340px,1fr)_minmax(420px,1fr)]">
      {/* ── Left Panel ── */}
      <section className="relative hidden min-h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,var(--color-leadgaze-auth-1)_0%,var(--color-leadgaze-auth-2)_10%,var(--color-leadgaze-auth-3)_20%,var(--color-leadgaze-auth-4)_30%,var(--color-leadgaze-auth-5)_40%,var(--color-leadgaze-auth-6)_50%,var(--color-leadgaze-auth-7)_60%,var(--color-leadgaze-auth-8)_70%,var(--color-leadgaze-auth-9)_80%,var(--color-leadgaze-auth-10)_90%,var(--color-leadgaze-auth-11)_100%)] px-12 py-16 text-white lg:flex xl:px-16">
        {/* Logo */}
        <div className="flex items-center gap-2 text-4xl font-bold tracking-tight">
          <Image
            src="/images/Leadgaze logo 2.png"
            alt="Leadgaze logo"
            width={36}
            height={34}
            className="h-8 w-auto"
            priority
          />
          <span>Leadgaze</span>
        </div>

        {/* Hero copy */}
        <div className="mt-20 max-w-[35rem]">
          <h1 className="text-[2.55rem] leading-[1.16] font-bold tracking-normal">
            Admin Portal
          </h1>

          <p className="mt-7 max-w-[31rem] text-base leading-7 text-white/82">
            Secure access for Leadgaze platform administrators. Manage
            workspaces, users, billing and platform health from one place.
          </p>

          <div className="mt-12 space-y-7">
            {[
              {
                icon: Shield,
                title: 'Super Admin Only',
                body: 'Access restricted to verified Leadgaze administrators',
              },
              {
                icon: Users,
                title: 'Manage All Workspaces',
                body: 'View and control every customer workspace on the platform',
              },
              {
                icon: Lock,
                title: 'Full Audit Trail',
                body: 'Every admin action is logged with timestamp and identity',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/12 ring-1 ring-white/10">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{item.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-white/70">
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer badge */}
        <div className="mt-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-medium ring-1 ring-white/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Internal use only — Leadgaze team
          </span>
        </div>
      </section>

      {/* ── Right Panel ── */}
      <section className="flex min-h-screen items-center justify-center bg-[var(--color-leadgaze-auth-surface)] px-5 py-10 sm:px-8 lg:px-[120px]">
        <div className="w-full max-w-[24rem]">
          {/* Mobile logo */}
          <div className="mb-9 flex justify-center lg:hidden">
            <div className="flex items-center gap-2 text-3xl font-bold tracking-tight text-[var(--color-leadgaze-auth-7)]">
              <Image
                src="/images/Leadgaze logo 2.png"
                alt="Leadgaze logo"
                width={36}
                height={34}
                className="h-7 w-auto"
                priority
              />
              <span>Leadgaze</span>
            </div>
          </div>

          {/* Auth card */}
          <div className="auth-card rounded-xl border border-slate-200 bg-white px-8 py-8 shadow-xl sm:px-9">
            <div className="mb-7">
              <h2 className="text-2xl font-semibold tracking-normal text-slate-800">
                Admin Sign In
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Enter your admin credentials to access the portal
              </p>
            </div>

            {/* Unauthorized error */}
            {error === 'unauthorized' && (
              <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Your account does not have admin access. Contact your platform
                administrator.
              </div>
            )}

            <SignInMethodsContainer
              paths={paths}
              providers={authConfig.providers}
            />
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-slate-400">
            This portal is restricted to authorised Leadgaze administrators.
            <br />
            Unauthorised access is prohibited.
          </p>
        </div>
      </section>
    </div>
  );
}

import { withI18n } from '~/lib/i18n/with-i18n';

export default withI18n(AdminSignInPage);

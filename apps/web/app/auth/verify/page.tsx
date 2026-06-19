import Image from 'next/image';
import { redirect } from 'next/navigation';

import { KeyRound, Shield, Smartphone } from 'lucide-react';

import { MultiFactorChallengeContainer } from '@kit/auth/mfa';
import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { createTrustedDevice } from '~/lib/trusted-devices/trusted-devices.actions';

interface Props {
  searchParams: Promise<{
    next?: string;
  }>;
}

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signIn'),
  };
};

async function VerifyPage(props: Props) {
  const client = getSupabaseServerClient();

  const { data } = await client.auth.getClaims();

  if (!data?.claims) {
    redirect(pathsConfig.auth.signIn);
  }

  const needsMfa = await checkRequiresMultiFactorAuthentication(client);

  if (!needsMfa) {
    redirect(pathsConfig.auth.signIn);
  }

  const nextPath = (await props.searchParams).next;
  const redirectPath = nextPath ?? pathsConfig.app.home;

  return (
    <div className="fixed inset-0 z-50 grid min-h-screen overflow-y-auto bg-[var(--color-leadgaze-auth-surface)] text-slate-800 lg:grid-cols-[minmax(340px,1fr)_minmax(420px,1fr)]">
      {/* Left brand panel */}
      <section className="relative hidden min-h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,var(--color-leadgaze-auth-1)_0%,var(--color-leadgaze-auth-2)_10%,var(--color-leadgaze-auth-3)_20%,var(--color-leadgaze-auth-4)_30%,var(--color-leadgaze-auth-5)_40%,var(--color-leadgaze-auth-6)_50%,var(--color-leadgaze-auth-7)_60%,var(--color-leadgaze-auth-8)_70%,var(--color-leadgaze-auth-9)_80%,var(--color-leadgaze-auth-10)_90%,var(--color-leadgaze-auth-11)_100%)] px-12 py-16 text-white lg:flex xl:px-16">
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

        <div className="mt-20 max-w-[35rem]">
          <h1 className="text-[2.55rem] leading-[1.16] font-bold tracking-normal">
            Secure Your Account With Multi-Factor Auth
          </h1>

          <p className="mt-7 max-w-[31rem] text-base leading-7 text-white/82">
            Enter the verification code from your authenticator app to continue.
          </p>

          <div className="mt-12 space-y-7">
            {[
              {
                icon: Shield,
                title: 'Enhanced security',
                body: 'Protect your account from unauthorized access',
              },
              {
                icon: Smartphone,
                title: 'Authenticator app',
                body: 'Use Google Authenticator, Authy, or 1Password',
              },
              {
                icon: KeyRound,
                title: 'Trust this device',
                body: 'Skip verification for 30 days on trusted devices',
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

        <div className="mt-auto">
          <p className="text-xs text-white/60">
            Having trouble? Contact support for help with your account.
          </p>
        </div>
      </section>

      {/* Right auth panel */}
      <section className="flex min-h-screen items-center justify-center bg-[var(--color-leadgaze-auth-surface)] px-5 py-10 sm:px-8 lg:px-[120px]">
        <div className="w-full max-w-[24rem]">
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

          <div className="auth-card rounded-xl border border-slate-200 bg-white px-8 py-8 shadow-xl sm:px-9">
            <div className="mb-7">
              <h2 className="text-2xl font-semibold tracking-normal text-slate-800">
                Two-factor authentication
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <MultiFactorChallengeContainer
              userId={data.claims.sub}
              paths={{
                redirectPath,
              }}
              onTrustDevice={createTrustedDevice}
            />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Your account is protected with MFA</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default withI18n(VerifyPage);

import Image from 'next/image';
import Link from 'next/link';

import { BadgeCheck, Clock3, Shield, Star } from 'lucide-react';

import { SignUpMethodsContainer } from '@kit/auth/sign-up';
import { Button } from '@kit/ui/button';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { Footer } from '../../_components/footer';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signUp'),
  };
};

const paths = {
  callback: pathsConfig.auth.callback,
  appHome: pathsConfig.app.home,
};

interface SignUpPageProps {
  searchParams: Promise<{
    next?: string;
    email?: string;
    invite_token?: string;
  }>;
}

async function SignUpPage({ searchParams }: SignUpPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextParam = resolvedSearchParams.next;
  const emailParam = resolvedSearchParams.email;
  const inviteTokenParam = resolvedSearchParams.invite_token;
  const signInUrl = nextParam
    ? `${pathsConfig.auth.signIn}?next=${encodeURIComponent(nextParam)}`
    : pathsConfig.auth.signIn;

  return (
    <div className="fixed inset-0 z-50 grid min-h-screen overflow-y-auto bg-slate-50 text-slate-900 lg:grid-cols-[minmax(360px,1fr)_minmax(420px,1fr)]">
      <section className="relative hidden min-h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,var(--color-leadgaze-auth-1)_0%,var(--color-leadgaze-auth-7)_54%,var(--color-leadgaze-auth-11)_100%)] px-14 py-14 text-white lg:flex xl:px-16">
        <div className="flex items-center gap-2 text-4xl font-bold tracking-normal">
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

        <div className="mt-16 max-w-[34rem]">
          <h1 className="text-[2.15rem] leading-[1.18] font-bold tracking-normal">
            Start Closing More Deals Today
          </h1>

          <p className="mt-7 max-w-[31rem] text-sm leading-7 text-white/78">
            Get started with Leadgaze in minutes. No credit card required.
          </p>

          <div className="mt-10 space-y-6">
            {[
              {
                icon: Shield,
                title: 'Free 7-day trial',
                body: 'No credit card required. Cancel anytime',
              },
              {
                icon: Clock3,
                title: 'Setup in 5 minutes',
                body: 'Import your data and start working immediately',
              },
              {
                icon: BadgeCheck,
                title: '24/7 support',
                body: 'Our team is here to help you succeed',
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/13 ring-1 ring-white/10">
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

        <div className="mt-auto rounded-lg border border-white/15 bg-white/10 px-5 py-5 shadow-xl">
          <div className="flex gap-1 text-amber-300">
            {[0, 1, 2, 3, 4].map((item) => (
              <Star key={item} className="h-4 w-4 fill-current" />
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-white/84">
            Leadgaze transformed how we manage our pipeline. We have seen a 40%
            increase in conversions in just 3 months.
          </p>

          <div className="mt-5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/25 ring-1 ring-white/35" />

            <div>
              <p className="text-xs font-semibold">Sarah Johnson</p>
              <p className="text-[0.68rem] text-white/66">
                Sales Director, TechCorp
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-8 sm:px-8 lg:px-[96px]">
        <div className="w-full max-w-[25rem]">
          <div className="mb-8 flex justify-center lg:hidden">
            <div className="flex items-center gap-2 text-3xl font-bold tracking-normal text-[var(--color-leadgaze-auth-7)]">
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
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-normal text-slate-800">
                Create your account
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Start your free 7-day trial. No credit card required.
              </p>
            </div>

            <SignUpMethodsContainer
              providers={authConfig.providers}
              displayTermsCheckbox={authConfig.displayTermsCheckbox}
              paths={paths}
              inviteToken={inviteTokenParam}
              email={emailParam}
            />

            <div className="mt-5 flex items-center justify-center gap-1 text-xs text-slate-500">
              <span>Already have an account?</span>
              <Button
                asChild
                variant={'link'}
                size={'sm'}
                className="h-auto p-0 text-xs font-semibold text-[var(--color-leadgaze-auth-7)]"
              >
                <Link href={signInUrl}>Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="h-3.5 w-3.5" />
            <span>Your data is secure and encrypted</span>
          </div>
        </div>
        <Footer />
      </section>
    </div>
  );
}

export default withI18n(SignUpPage);

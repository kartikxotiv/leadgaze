import Image from 'next/image';
import Link from 'next/link';

import { Star, TrendingUp, UsersRound, Zap } from 'lucide-react';

import { SignInMethodsContainer } from '@kit/auth/sign-in';
import { Button } from '@kit/ui/button';

import authConfig from '~/config/auth.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

import { Footer } from '../../_components/footer';

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();

  return {
    title: i18n.t('auth:signIn'),
  };
};

const paths = {
  callback: pathsConfig.auth.callback,
  home: pathsConfig.app.home,
};

interface SignInPageProps {
  searchParams: Promise<{
    next?: string;
  }>;
}

async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextParam = resolvedSearchParams.next;
  const signUpUrl = nextParam
    ? `${pathsConfig.auth.signUp}?next=${encodeURIComponent(nextParam)}`
    : pathsConfig.auth.signUp;

  return (
    <div className="fixed inset-0 z-50 grid min-h-screen overflow-y-auto bg-[var(--color-leadgaze-auth-surface)] text-slate-800 lg:grid-cols-[minmax(340px,1fr)_minmax(420px,1fr)]">
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
            Transform Your Lead Management Into Revenue
          </h1>

          <p className="mt-7 max-w-[31rem] text-base leading-7 text-white/82">
            Join thousands of sales teams using Leadgaze to close deals faster
            and grow their business.
          </p>

          <div className="mt-12 space-y-7">
            {[
              {
                icon: TrendingUp,
                title: 'Increase conversions by 3x',
                body: 'Track and optimize your entire sales pipeline',
              },
              {
                icon: UsersRound,
                title: 'Built for teams',
                body: 'Collaborate seamlessly across your organization',
              },
              {
                icon: Zap,
                title: 'Automate repetitive tasks',
                body: 'Focus on closing deals, not data entry',
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
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[0, 1, 2, 3].map((item) => (
                <span
                  key={item}
                  className="block h-9 w-9 rounded-full border border-white/45 bg-white/25"
                />
              ))}
            </div>

            <span className="text-xs font-medium text-white/85">
              Join 10,000+ users
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex gap-1 text-amber-300">
              {[0, 1, 2, 3, 4].map((item) => (
                <Star key={item} className="h-4 w-4 fill-current" />
              ))}
            </div>

            <span className="text-xs text-white/86">
              4.9/5 from 500+ reviews
            </span>
          </div>
        </div>
      </section>

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
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Enter your credentials to access your account
              </p>
            </div>

            <SignInMethodsContainer
              paths={paths}
              providers={authConfig.providers}
            />

            <div className="mt-5 flex items-center justify-center gap-1 text-xs text-slate-500">
              <span>Don&apos;t have an account?</span>
              <Button
                asChild
                variant={'link'}
                size={'sm'}
                className="h-auto p-0 text-xs font-semibold text-[var(--color-leadgaze-auth-7)]"
              >
                <Link href={signUpUrl}>Sign up for free</Link>
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs font-medium text-slate-400">
              Trusted by leading companies
            </p>

            <div className="mt-5 flex items-center justify-center gap-8 text-sm font-bold text-slate-400">
              <span>COMPANY</span>
              <span>BRAND</span>
              <span>CORP</span>
            </div>
          </div>
        </div>
        <Footer />
      </section>
    </div>
  );
}

export default withI18n(SignInPage);

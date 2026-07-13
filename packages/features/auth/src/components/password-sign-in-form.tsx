'use client';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';

import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

import { PasswordSignInSchema } from '../schemas/password-sign-in.schema';

export function PasswordSignInForm({
  onSubmit,
  loading,
}: {
  onSubmit: (params: z.infer<typeof PasswordSignInSchema>) => unknown;
  loading: boolean;
}) {
  const { t } = useTranslation('auth');

  const form = useForm<z.infer<typeof PasswordSignInSchema>>({
    resolver: zodResolver(PasswordSignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form
        className={'w-full space-y-4'}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name={'email'}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-slate-800 dark:text-slate-800">
                <Trans i18nKey={'common:emailAddress'} />
              </FormLabel>

              <FormControl>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    data-test={'email-input'}
                    required
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    className="h-10 rounded-lg border-slate-200 bg-white pr-3 pl-10 text-sm shadow-none placeholder:text-slate-400 focus-visible:ring-[var(--color-leadgaze-auth-7)]"
                    {...field}
                  />
                </div>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={'password'}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <FormLabel className="text-xs font-semibold text-slate-800 dark:text-slate-800">
                  <Trans i18nKey={'common:password'} />
                </FormLabel>

                <Button
                  asChild
                  type={'button'}
                  size={'sm'}
                  variant={'link'}
                  className={
                    'h-auto p-0 text-xs font-semibold text-[var(--color-leadgaze-auth-7)]'
                  }
                >
                  <Link href={'/auth/password-reset'}>
                    <Trans i18nKey={'auth:passwordForgottenQuestion'} />
                  </Link>
                </Button>
              </div>

              <FormControl>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    required
                    data-test={'password-input'}
                    type="password"
                    placeholder={'Enter your password'}
                    className="h-10 rounded-lg border-slate-200 bg-white pr-3 pl-10 text-sm shadow-none placeholder:text-slate-400 focus-visible:ring-[var(--color-leadgaze-auth-7)]"
                    {...field}
                  />
                </div>
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-slate-300 accent-[var(--color-leadgaze-auth-7)]"
          />
          <span>Remember me for 30 days</span>
        </label>

        <Button
          data-test="auth-submit-button"
          className={
            'group h-10 w-full rounded-lg bg-[var(--color-leadgaze-auth-7)] text-sm font-semibold text-white shadow-none hover:bg-[var(--color-leadgaze-auth-11)]'
          }
          type="submit"
          disabled={loading}
        >
          <If condition={loading} fallback={<Trans i18nKey={'auth:signIn'} />}>
            <Trans i18nKey={'auth:signingIn'} />
          </If>
        </Button>
      </form>
    </Form>
  );
}

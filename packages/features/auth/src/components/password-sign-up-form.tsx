'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

import { PasswordSignUpSchema } from '../schemas/password-sign-up.schema';
import { TermsAndConditionsFormField } from './terms-and-conditions-form-field';

export function PasswordSignUpForm({
  defaultValues,
  displayTermsCheckbox,
  onSubmit,
  loading,
}: {
  defaultValues?: {
    email: string;
  };

  displayTermsCheckbox?: boolean;

  onSubmit: (params: {
    email: string;
    password: string;
    repeatPassword: string;
    fullName: string;
  }) => unknown;
  loading: boolean;
}) {
  const form = useForm({
    resolver: zodResolver(PasswordSignUpSchema),
    defaultValues: {
      email: defaultValues?.email ?? '',
      password: '',
      repeatPassword: '',
      fullName: '',
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
          name={'fullName'}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-slate-800">
                <Trans i18nKey={'Full Name'} />
              </FormLabel>

              <FormControl>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    data-test={'full-name-input'}
                    required
                    placeholder={'John Doe'}
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
          name={'email'}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-slate-800">
                Work email
              </FormLabel>

              <FormControl>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    data-test={'email-input'}
                    required
                    type="email"
                    placeholder={'you@company.com'}
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
              <FormLabel className="text-xs font-semibold text-slate-800">
                <Trans i18nKey={'common:password'} />
              </FormLabel>

              <FormControl>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    required
                    data-test={'password-input'}
                    type="password"
                    placeholder={'Create a strong password'}
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
          name={'repeatPassword'}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold text-slate-800">
                Confirm password
              </FormLabel>

              <FormControl>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    required
                    data-test={'repeat-password-input'}
                    type="password"
                    placeholder={'Repeat your password'}
                    className="h-10 rounded-lg border-slate-200 bg-white pr-3 pl-10 text-sm shadow-none placeholder:text-slate-400 focus-visible:ring-[var(--color-leadgaze-auth-7)]"
                    {...field}
                  />
                </div>
              </FormControl>

              <FormMessage />

              <FormDescription className={'text-xs text-slate-400'}>
                <Trans i18nKey={'auth:repeatPasswordHint'} />
              </FormDescription>
            </FormItem>
          )}
        />

        <If condition={displayTermsCheckbox}>
          <TermsAndConditionsFormField />
        </If>

        <Button
          data-test={'auth-submit-button'}
          className={
            'h-10 w-full rounded-lg bg-[var(--color-leadgaze-auth-7)] text-sm font-semibold text-white shadow-none hover:bg-[var(--color-leadgaze-auth-11)]'
          }
          type="submit"
          disabled={loading}
        >
          <If condition={loading} fallback={'Create account'}>
            <Trans i18nKey={'auth:signingUp'} />
          </If>
        </Button>
      </form>
    </Form>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { CheckCircledIcon } from '@radix-ui/react-icons';

import { useSignUpWithEmailAndPassword } from '@kit/supabase/hooks/use-sign-up-with-email-password';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { useCaptchaToken } from '../captcha/client';
import { AuthErrorAlert } from './auth-error-alert';
import { PasswordSignUpForm } from './password-sign-up-form';

interface EmailPasswordSignUpContainerProps {
  displayTermsCheckbox?: boolean;
  defaultValues?: {
    email: string;
  };

  onSignUp?: (userId?: string) => unknown;
  emailRedirectTo: string;
  appHome?: string;
}

export function EmailPasswordSignUpContainer({
  defaultValues,
  onSignUp,
  emailRedirectTo,
  appHome,
  displayTermsCheckbox,
}: EmailPasswordSignUpContainerProps) {
  const router = useRouter();
  const { captchaToken, resetCaptchaToken } = useCaptchaToken();

  const signUpMutation = useSignUpWithEmailAndPassword();
  const redirecting = useRef(false);
  const [showVerifyEmailAlert, setShowVerifyEmailAlert] = useState(false);
  const [signupEmail, setSignupEmail] = useState<string | null>(null);

  const loading = signUpMutation.isPending || redirecting.current;

  const onSignupRequested = useCallback(
    async (credentials: { email: string; password: string }) => {
      if (loading) {
        return;
      }

      try {
        const data = await signUpMutation.mutateAsync({
          ...credentials,
          emailRedirectTo,
          captchaToken,
        });

        setSignupEmail(credentials.email);
        setShowVerifyEmailAlert(true);

        if (onSignUp) {
          onSignUp(data.user?.id);
        }
      } catch (error) {
        // we log the error to the console for debugging
        // but we don't use console.error to avoid the DevOverlay
      } finally {
        resetCaptchaToken();
      }
    },
    [
      captchaToken,
      emailRedirectTo,
      loading,
      onSignUp,
      resetCaptchaToken,
      signUpMutation,
    ],
  );

  useEffect(() => {
    if (showVerifyEmailAlert && appHome && signupEmail) {
      const checkInvitationsAndRedirect = async () => {
        try {
          // Check for pending workspace invitations
          const response = await fetch(
            `/api/team-members/invite/by-email?email=${encodeURIComponent(signupEmail)}`,
          );

          if (response.ok) {
            const result = await response.json();
            if (result.data?.token) {
              // Found a pending invitation, redirect to invite page
              router.push(`/invite?token=${result.data.token}`);
              return;
            }
          }
        } catch (error) {
          // If check fails, proceed with normal redirect
          console.error('Error checking invitations:', error);
        }

        // No invitation found or error occurred, proceed with normal redirect
        router.push(appHome);
      };

      const timer = setTimeout(() => {
        checkInvitationsAndRedirect();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showVerifyEmailAlert, appHome, router, signupEmail]);

  return (
    <>
      <If condition={showVerifyEmailAlert}>
        <SuccessAlert />
      </If>

      <If condition={!showVerifyEmailAlert}>
        <AuthErrorAlert error={signUpMutation.error} />

        <PasswordSignUpForm
          onSubmit={onSignupRequested}
          loading={loading}
          defaultValues={defaultValues}
          displayTermsCheckbox={displayTermsCheckbox}
        />
      </If>
    </>
  );
}

function SuccessAlert() {
  return (
    <Alert variant={'success'}>
      <CheckCircledIcon className={'w-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:emailConfirmationAlertHeading'} />
      </AlertTitle>

      <AlertDescription data-test={'email-confirmation-alert'}>
        <Trans i18nKey={'auth:emailConfirmationAlertBody'} />
      </AlertDescription>
    </Alert>
  );
}

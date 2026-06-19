'use client';

import type { Provider } from '@supabase/supabase-js';

import { isBrowser } from '@kit/shared/utils';
import { If } from '@kit/ui/if';
import { Separator } from '@kit/ui/separator';

import { MagicLinkAuthContainer } from './magic-link-auth-container';
import { OauthProviders } from './oauth-providers';
import { EmailPasswordSignUpContainer } from './password-sign-up-container';

export function SignUpMethodsContainer(props: {
  paths: {
    callback: string;
    appHome: string;
  };

  providers: {
    password: boolean;
    magicLink: boolean;
    oAuth: Provider[];
  };

  displayTermsCheckbox?: boolean;
  inviteToken?: string;
  email?: string;
}) {
  const redirectUrl = getCallbackUrl(props);
  const defaultValues = getDefaultValues(props.email, props.inviteToken);

  // Use 'next' parameter for redirect after signup if present,
  // otherwise fallback to default appHome
  const appHome = getAppHome(props.paths.appHome);

  return (
    <>
      <If condition={props.providers.password}>
        <EmailPasswordSignUpContainer
          emailRedirectTo={redirectUrl}
          defaultValues={defaultValues}
          displayTermsCheckbox={props.displayTermsCheckbox}
          appHome={appHome}
        />
      </If>

      <If condition={props.providers.magicLink}>
        <MagicLinkAuthContainer
          redirectUrl={redirectUrl}
          shouldCreateUser={true}
          defaultValues={defaultValues}
          displayTermsCheckbox={props.displayTermsCheckbox}
        />
      </If>

      <If condition={props.providers.oAuth.length}>
        <Separator />

        <OauthProviders
          enabledProviders={props.providers.oAuth}
          shouldCreateUser={true}
          paths={{
            callback: props.paths.callback,
            returnPath: props.paths.appHome,
          }}
        />
      </If>
    </>
  );
}

function getCallbackUrl(props: {
  paths: {
    callback: string;
    appHome: string;
  };

  inviteToken?: string;
}) {
  if (!isBrowser()) {
    return '';
  }

  const redirectPath = props.paths.callback;
  const origin = window.location.origin;
  const url = new URL(redirectPath, origin);

  if (props.inviteToken) {
    url.searchParams.set('invite_token', props.inviteToken);
  }

  const searchParams = new URLSearchParams(window.location.search);
  const next = searchParams.get('next');

  if (next) {
    url.searchParams.set('next', next);
  }

  return url.href;
}

function getDefaultValues(emailProp?: string, inviteTokenProp?: string) {
  if (inviteTokenProp) {
    return {
      email: emailProp ?? '',
      isEmailReadOnly: true,
    };
  }

  if (!isBrowser()) {
    return { email: '', isEmailReadOnly: false };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const inviteToken = searchParams.get('invite_token');

  if (!inviteToken) {
    return { email: '', isEmailReadOnly: false };
  }

  return {
    email: searchParams.get('email') ?? '',
    isEmailReadOnly: true,
  };
}
function getAppHome(defaultAppHome: string) {
  if (!isBrowser()) {
    return defaultAppHome;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const next = searchParams.get('next');

  return next || defaultAppHome;
}

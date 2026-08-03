import Link from 'next/link';

import { Alert, AlertDescription } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';

export const generateMetadata = async () => {
  const { t } = await createI18nServerInstance();

  return {
    title: t('auth:passwordResetLabel'),
  };
};

interface PasswordResetConfirmPageProps {
  searchParams: Promise<{
    token_hash?: string;
  }>;
}

async function PasswordResetConfirmPage(props: PasswordResetConfirmPageProps) {
  const { token_hash: tokenHash } = await props.searchParams;

  if (!tokenHash) {
    return (
      <div className={'flex flex-col space-y-4'}>
        <Alert variant={'warning'}>
          <AlertDescription>
            <Trans i18nKey={'auth:errors.invalidPasswordResetLink'} />
          </AlertDescription>
        </Alert>

        <Button asChild>
          <Link href={pathsConfig.auth.passwordReset}>
            <Trans i18nKey={'auth:getNewLink'} />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={'flex flex-col space-y-4'}>
      <Heading level={5} className={'tracking-tight'}>
        <Trans i18nKey={'auth:passwordResetLabel'} />
      </Heading>

      <p className={'text-muted-foreground text-sm'}>
        <Trans i18nKey={'auth:passwordResetConfirmDescription'} />
      </p>

      <form action={pathsConfig.auth.callback} method={'get'}>
        <input type={'hidden'} name={'token_hash'} value={tokenHash} />
        <input type={'hidden'} name={'type'} value={'recovery'} />
        <input
          type={'hidden'}
          name={'next'}
          value={pathsConfig.auth.passwordUpdate}
        />

        <Button
          className={'w-full'}
          type={'submit'}
          data-test={'confirm-password-reset'}
        >
          <Trans i18nKey={'common:continue'} />
        </Button>
      </form>
    </div>
  );
}

export default withI18n(PasswordResetConfirmPage);

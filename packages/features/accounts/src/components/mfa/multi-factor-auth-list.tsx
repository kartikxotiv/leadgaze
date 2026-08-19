'use client';

import { useCallback, useState } from 'react';

import type { Factor } from '@supabase/supabase-js';

import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useFetchAuthFactors } from '@kit/supabase/hooks/use-fetch-mfa-factors';
import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useFactorsMutationKey } from '@kit/supabase/hooks/use-user-factors-mutation-key';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@kit/ui/input-otp';
import { Spinner } from '@kit/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';

import { refreshAuthSession } from '../../server/server-actions';
import { MultiFactorAuthSetupDialog } from './multi-factor-auth-setup-dialog';

function MFAChallengeForm({
  userId,
  onVerified,
}: {
  userId: string;
  onVerified: () => void;
}) {
  const client = useSupabase();
  const { data: factors } = useFetchAuthFactors(userId);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError('');

    try {
      const factorId = factors?.all?.[0]?.id;
      if (!factorId) {
        throw new Error('No enrolled factor found');
      }

      const challenge = await client.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await client.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verify.error) throw verify.error;

      await refreshAuthSession();
      onVerified();
      toast.success('Identity verified successfully');
    } catch (err) {
      setError((err as Error).message || 'Verification failed');
      toast.error('Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 rounded-lg border border-yellow-200 bg-yellow-50/50 p-6 dark:border-yellow-900/30 dark:bg-yellow-950/10">
      <div className="flex flex-col space-y-2">
        <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">
          Re-authentication Required
        </h4>
        <p className="text-sm text-yellow-700 dark:text-yellow-500">
          To manage your multi-factor authentication, please enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form onSubmit={handleVerify} className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2">
          <InputOTP value={code} onChange={setCode} maxLength={6}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div>
          <Button type="submit" disabled={code.length !== 6 || loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function MultiFactorAuthFactorsList(props: { userId: string }) {
  const client = useSupabase();
  const queryClient = useQueryClient();

  const { data: assuranceLevel, isLoading } = useQuery({
    queryKey: ['mfa-aal-level', props.userId],
    queryFn: async () => {
      const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className={'flex items-center space-x-4 py-4'}>
        <Spinner />
        <div>
          <Trans i18nKey={'account:loadingFactors'} />
        </div>
      </div>
    );
  }

  const isBypassed =
    assuranceLevel?.currentLevel === 'aal1' &&
    assuranceLevel?.nextLevel === 'aal2';

  if (isBypassed) {
    return (
      <MFAChallengeForm
        userId={props.userId}
        onVerified={() => {
          void queryClient.invalidateQueries({
            queryKey: ['mfa-aal-level', props.userId],
          });
        }}
      />
    );
  }

  return (
    <div className={'flex flex-col space-y-4'}>
      <FactorsTableContainer userId={props.userId} />

      <div>
        <MultiFactorAuthSetupDialog userId={props.userId} />
      </div>
    </div>
  );
}

function FactorsTableContainer(props: { userId: string }) {
  const {
    data: factors,
    isLoading,
    isError,
  } = useFetchAuthFactors(props.userId);

  if (isLoading) {
    return (
      <div className={'flex items-center space-x-4'}>
        <Spinner />

        <div>
          <Trans i18nKey={'account:loadingFactors'} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <Alert variant={'destructive'}>
          <ExclamationTriangleIcon className={'h-4'} />

          <AlertTitle className="text-leadgaze-dark dark:text-white">
            <Trans i18nKey={'account:factorsListError'} />
          </AlertTitle>

          <AlertDescription className="text-leadgaze-dark dark:text-white">
            <Trans i18nKey={'account:factorsListErrorDescription'} />
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const allFactors = factors?.all ?? [];

  if (!allFactors.length) {
    return (
      <div className={'flex flex-col space-y-4'}>
        <Alert>
          <ShieldCheck className={'h-4'} />

          <AlertTitle className="text-leadgaze-dark dark:text-white">
            <Trans i18nKey={'account:multiFactorAuthHeading'} />
          </AlertTitle>

          <AlertDescription className="text-leadgaze-dark dark:text-white">
            <Trans i18nKey={'account:multiFactorAuthDescription'} />
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <FactorsTable factors={allFactors} userId={props.userId} />;
}

function ConfirmUnenrollFactorModal(
  props: React.PropsWithChildren<{
    factorId: string;
    userId: string;
    setIsModalOpen: (isOpen: boolean) => void;
  }>,
) {
  const { t } = useTranslation();
  const unEnroll = useUnenrollFactor(props.userId);
  const signOut = useSignOut();

  const onUnenrollRequested = useCallback(
    (factorId: string) => {
      if (unEnroll.isPending) return;

      const promise = unEnroll.mutateAsync(factorId).then(async (response) => {
        props.setIsModalOpen(false);

        if (!response.success) {
          const errorCode = response.data;

          throw t(`auth:errors.${errorCode}`, {
            defaultValue: t(`account:unenrollFactorError`),
          });
        }

        await signOut.mutateAsync();
        window.location.replace('/auth/sign-in');
      });

      toast.promise(promise, {
        loading: t(`account:unenrollingFactor`),
        success: t(`account:unenrollFactorSuccess`),
        error: (error: string) => {
          return error;
        },
      });
    },
    [props, t, unEnroll, signOut],
  );

  return (
    <AlertDialog open={!!props.factorId} onOpenChange={props.setIsModalOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey={'account:unenrollFactorModalHeading'} />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey={'account:unenrollFactorModalDescription'} />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans i18nKey={'common:cancel'} />
          </AlertDialogCancel>

          <AlertDialogAction
            type={'button'}
            disabled={unEnroll.isPending}
            onClick={() => onUnenrollRequested(props.factorId)}
          >
            <Trans i18nKey={'account:unenrollFactorModalButtonLabel'} />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FactorsTable({
  factors,
  userId,
}: React.PropsWithChildren<{
  factors: Factor[];
  userId: string;
}>) {
  const [unEnrolling, setUnenrolling] = useState<string>();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Trans i18nKey={'account:factorName'} />
            </TableHead>
            <TableHead>
              <Trans i18nKey={'account:factorType'} />
            </TableHead>
            <TableHead>
              <Trans i18nKey={'account:factorStatus'} />
            </TableHead>

            <TableHead />
          </TableRow>
        </TableHeader>

        <TableBody>
          {factors.map((factor) => (
            <TableRow key={factor.id}>
              <TableCell>
                <span className={'block truncate'}>{factor.friendly_name}</span>
              </TableCell>

              <TableCell>
                <Badge variant={'info'} className={'inline-flex uppercase'}>
                  {factor.factor_type}
                </Badge>
              </TableCell>

              <td>
                <Badge
                  className={'inline-flex capitalize'}
                  variant={factor.status === 'verified' ? 'success' : 'outline'}
                >
                  {factor.status}
                </Badge>
              </td>

              <td className={'flex justify-end'}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={'ghost'}
                        size={'icon'}
                        onClick={() => setUnenrolling(factor.id)}
                      >
                        <X className={'h-4'} />
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent>
                      <Trans i18nKey={'account:unenrollTooltip'} />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </td>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <If condition={unEnrolling}>
        {(factorId) => (
          <ConfirmUnenrollFactorModal
            userId={userId}
            factorId={factorId}
            setIsModalOpen={() => setUnenrolling(undefined)}
          />
        )}
      </If>
    </>
  );
}

function useUnenrollFactor(userId: string) {
  const queryClient = useQueryClient();
  const client = useSupabase();
  const mutationKey = useFactorsMutationKey(userId);

  const mutationFn = async (factorId: string) => {
    const { data, error } = await client.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      return {
        success: false as const,
        data: error.code as string,
      };
    }

    return {
      success: true as const,
      data,
    };
  };

  return useMutation({
    mutationFn,
    mutationKey,
    onSuccess: () => {
      return queryClient.refetchQueries({
        queryKey: mutationKey,
      });
    },
  });
}

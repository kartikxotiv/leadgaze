import Link from 'next/link';

import { Checkbox } from '@kit/ui/checkbox';
import { FormControl, FormField, FormItem, FormMessage } from '@kit/ui/form';
import { Trans } from '@kit/ui/trans';

export function TermsAndConditionsFormField(
  props: {
    name?: string;
  } = {},
) {
  return (
    <FormField
      name={props.name ?? 'termsAccepted'}
      render={({ field }) => {
        return (
          <FormItem>
            <FormControl>
              <label
                className={
                  'flex items-start justify-center gap-2 py-1 text-center'
                }
              >
                <Checkbox required name={field.name} />

                <div className={'text-xs leading-5 text-slate-500'}>
                  <Trans
                    i18nKey={'auth:acceptTermsAndConditions'}
                    components={{
                      TermsOfServiceLink: (
                        <Link
                          target={'_blank'}
                          className={
                            'font-medium text-[var(--color-leadgaze-auth-7)] underline-offset-2 hover:underline'
                          }
                          href={'/terms-of-service'}
                        >
                          <Trans i18nKey={'auth:termsOfService'} />
                        </Link>
                      ),
                      PrivacyPolicyLink: (
                        <Link
                          target={'_blank'}
                          className={
                            'font-medium text-[var(--color-leadgaze-auth-7)] underline-offset-2 hover:underline'
                          }
                          href={'/privacy-policy'}
                        >
                          <Trans i18nKey={'auth:privacyPolicy'} />
                        </Link>
                      ),
                    }}
                  />
                </div>
              </label>
            </FormControl>

            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

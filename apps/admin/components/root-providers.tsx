'use client';

import { useMemo } from 'react';

import { ThemeProvider } from 'next-themes';

import { I18nProvider } from '@kit/i18n/provider';

import { i18nResolver } from '~/lib/i18n/i18n.resolver';
import { getI18nSettings } from '~/lib/i18n/i18n.settings';

import { ReactQueryProvider } from './react-query-provider';

export function RootProviders({
  lang,
  theme,
  children,
}: React.PropsWithChildren<{
  lang: string;
  theme?: string;
}>) {
  const i18nSettings = useMemo(() => getI18nSettings(lang), [lang]);

  return (
    <ReactQueryProvider>
      <I18nProvider settings={i18nSettings} resolver={i18nResolver}>
        <ThemeProvider
          attribute="class"
          enableSystem
          disableTransitionOnChange
          defaultTheme={theme ?? 'light'}
          enableColorScheme={false}
        >
          {children}
        </ThemeProvider>
      </I18nProvider>
    </ReactQueryProvider>
  );
}

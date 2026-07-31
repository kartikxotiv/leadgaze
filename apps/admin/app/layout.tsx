import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { Toaster } from 'sonner';

import { RootProviders } from '~/components/root-providers';
import { sans, heading } from '~/lib/fonts';
import { withI18n } from '~/lib/i18n/with-i18n';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';

import './globals.css';

export const metadata: Metadata = {
  title: 'Leadgaze Admin',
  description: 'Leadgaze Admin Panel — manage your platform.',
};

async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const i18n = await createI18nServerInstance();
  const language = i18n.language ?? 'en';
  const theme = await getTheme();
  const className = getClassName(theme);

  return (
    <html lang={language} className={className}>
      <body suppressHydrationWarning>
        <RootProviders lang={language} theme={theme}>
          {children}
        </RootProviders>

        <Toaster richColors={true} theme={theme} position="top-center" />
      </body>
    </html>
  );
}

export default withI18n(RootLayout);

function getClassName(theme?: string) {
  const dark = theme === 'dark';

  const fontClasses = [sans.variable, heading.variable]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(' ');

  return [
    'bg-background min-h-screen antialiased',
    fontClasses,
    dark ? 'dark' : 'light',
  ]
    .filter(Boolean)
    .join(' ');
}

async function getTheme() {
  const cookiesStore = await cookies();
  return cookiesStore.get('theme')?.value as 'light' | 'dark' | 'system' | undefined;
}

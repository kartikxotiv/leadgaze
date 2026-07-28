'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { useTheme } from 'next-themes';

import { cn } from '@kit/ui/utils';

import { useRBAC } from '~/lib/rbac/rbac-provider';

function LogoImage({
  className,
  width = 105,
  collapsed = false,
  variant = 'app',
}: {
  className?: string;
  width?: number;
  collapsed?: boolean;
  variant?: 'app' | 'marketing';
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  let rbac = null;
  try {
    // eslint-disable-next-line react-hooks-rules-of-hooks
    rbac = useRBAC();
  } catch {
    // outside RBACProvider (e.g. login or marketing screens)
  }

  const companyLogoUrl = rbac?.currentWorkspace?.company_logo_url;

  if (collapsed) {
    return (
      <Image
        src={'/images/favicon/apple-touch-icon.png'}
        height={24}
        width={24}
        alt="leadgaze"
        className={cn('mx-auto rounded-md', className)}
      />
    );
  }

  if (mounted && companyLogoUrl) {
    return (
      <Image
        src={companyLogoUrl}
        height={32}
        width={180}
        alt="company logo"
        className={cn('h-6 w-auto object-contain max-w-[120px]', className)}
        priority
      />
    );
  }

  const logoSrc =
    variant === 'marketing'
      ? '/images/lead-gaze-logo-main-screen.png'
      : '/images/leadgaze-logo-mini.png';

  if (variant === 'marketing') {
    return (
      <Image
        src={logoSrc}
        height={32}
        width={width}
        alt="leadgaze"
        className={cn('h-8 w-auto object-contain', className)}
        priority
      />
    );
  }

  return (
    <Image
      src={logoSrc}
      height={32}
      width={32}
      alt="leadgaze"
      className={cn('h-8 w-8 object-contain', className)}
    />
  );
}

export function AppLogo({
  href,
  label,
  className,
  collapsed,
  variant = 'app',
}: {
  href?: string | null;
  className?: string;
  label?: string;
  collapsed?: boolean;
  variant?: 'app' | 'marketing';
}) {
  if (href === null) {
    return (
      <LogoImage
        className={className}
        collapsed={collapsed}
        variant={variant}
      />
    );
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'}>
      <LogoImage
        className={className}
        collapsed={collapsed}
        variant={variant}
      />
    </Link>
  );
}

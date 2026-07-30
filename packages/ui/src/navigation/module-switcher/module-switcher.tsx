'use client';

import { useMemo } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { cn } from '../../lib/utils';

export type ModuleKey = 'leadgaze' | 'hrms';

export interface ModuleSwitcherProps {
  className?: string;
  value?: ModuleKey;
  onChange?: (module: ModuleKey) => void;
}

export function ModuleSwitcher(props: ModuleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = useMemo<ModuleKey>(() => {
    const selected = searchParams.get('module');
    if (pathname.startsWith('/home/hrms')) {
      return 'hrms';
    }

    return selected === 'hrms' ? 'hrms' : (props.value ?? 'leadgaze');
  }, [pathname, props.value, searchParams]);

  return (
    <div className={cn('flex items-center gap-3', props.className)}>
      {/* Placeholder container matching existing module-switcher logic */}
    </div>
  );
}

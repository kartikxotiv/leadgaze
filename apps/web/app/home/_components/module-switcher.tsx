'use client';

import { useMemo } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { cn } from '@kit/ui/utils';

type ModuleKey = 'leadgaze' | 'hrms';

export function ModuleSwitcher(props: {
  className?: string;
  value?: ModuleKey;
}) {
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
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldCheck className="text-muted-foreground h-4 w-4" />
        Module
      </div>

      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue === 'hrms') {
            router.push('/home/hrms');
            return;
          }

          router.push('/home');
        }}
      >
        <SelectTrigger className="w-[190px]">
          <SelectValue placeholder="Select module" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="leadgaze">
            <span className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Leadgaze
            </span>
          </SelectItem>
          <SelectItem value="hrms">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              HRMS
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
      <ChevronDown className="text-muted-foreground h-4 w-4" />
    </div>
  );
}

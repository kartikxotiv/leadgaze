'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@kit/ui/button';
import { RocketIcon } from 'lucide-react';

export function WelcomeModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setOpen(true);
      // Immediately strip ?welcome=1 from URL so it never triggers again
      const url = new URL(window.location.href);
      url.searchParams.delete('welcome');
      router.replace(url.pathname + (url.search || ''));
    }
  }, [searchParams, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-[1px] animate-in fade-in duration-300"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl bg-white border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >        
        
        <div className="px-7 py-10 text-center">
          {/* Logo mark */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3953E7] shadow-lg shadow-[#3953E7]/30">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>

          <h2 className="mb-3 text-2xl font-bold text-leadgaze-dark">
            Welcome to Leadgaze!
          </h2>

          <p className="mb-2 text-sm leading-relaxed text-leadgaze-muted">
            We&apos;ve set up your workspace and activated a{' '}
            <span className="font-semibold text-leadgaze-primary">free 7-day trial</span>{' '}
            so you can explore everything Leadgaze has to offer.
          </p>

          <p className="mb-8 text-sm text-leadgaze-muted">
            After your trial ends, you can choose a plan that fits your team.
          </p>

          <Button
            onClick={() => setOpen(false)}
            className="w-full bg-leadgaze-primary text-white font-semibold rounded-xl py-2.5 transition-all shadow-lg"
          >
            Start Exploring <RocketIcon className="ml-2 h-4 w-4 mt-1" />
          </Button>

          <p className="mt-4 text-xs text-leadgaze-muted">
            You can manage your subscription anytime in Workspace Settings.
          </p>
        </div>
      </div>
    </div>
  );
}

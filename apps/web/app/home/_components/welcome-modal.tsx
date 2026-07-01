'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@kit/ui/button';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl bg-[#111317] border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing accent top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#3953E7] via-[#6B7FFF] to-[#3953E7]" />

        <div className="px-8 py-10 text-center">
          {/* Logo mark */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3953E7] shadow-lg shadow-[#3953E7]/30">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>

          <h2 className="mb-3 text-2xl font-bold text-white">
            Welcome to Leadgaze!
          </h2>

          <p className="mb-2 text-sm leading-relaxed text-slate-400">
            We&apos;ve set up your workspace and activated a{' '}
            <span className="font-semibold text-white">free 7-day trial</span>{' '}
            so you can explore everything Leadgaze has to offer.
          </p>

          <p className="mb-8 text-sm text-slate-500">
            After your trial ends, you can choose a plan that fits your team.
          </p>

          <Button
            onClick={() => setOpen(false)}
            className="w-full bg-[#3953E7] hover:bg-[#283BA4] text-white font-semibold rounded-xl py-2.5 transition-all shadow-lg shadow-[#3953E7]/25 hover:shadow-[#3953E7]/40"
          >
            Start Exploring
          </Button>

          <p className="mt-4 text-xs text-slate-600">
            You can manage your subscription anytime in Workspace Settings.
          </p>
        </div>
      </div>
    </div>
  );
}

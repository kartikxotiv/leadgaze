'use client';

import * as React from 'react';
import { LayoutDashboard, Users, Headphones, Settings, Bell, Search, CircleUser } from 'lucide-react';
import Image from 'next/image';

interface DashboardPreviewProps {
  companyName: string;
  slug: string;
  logoUrl?: string | null;
}

export function DashboardPreview({ companyName, slug, logoUrl }: DashboardPreviewProps) {
  const initial = companyName ? companyName.charAt(0).toUpperCase() : 'W';
  const displayCompany = companyName || 'Company';

  return (
    <div className="relative w-full h-full min-h-screen bg-[var(--color-leadgaze-primary)] overflow-hidden select-none">
      {/* Blurred Dashboard Mockup (Light Mode Simulation) */}
      <div className="absolute inset-0 filter blur-[0.5px] opacity-90 pointer-events-none mix-blend-screen bg-white/5">
        {/* Header */}
        <div className="h-14 border-b border-white/20 bg-white/20 flex items-center px-4 justify-between backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <div className="relative w-6 h-6 rounded overflow-hidden">
                  <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-[var(--color-leadgaze-primary)] font-bold text-xs shadow-sm">
                  {companyName ? initial : 'L'}
                </div>
              )}
              <span className="font-semibold text-white">{companyName || 'Leadgaze'}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <div className="px-3 py-1.5 bg-white/30 text-white rounded-md font-medium shadow-sm">Sales</div>
              <div className="px-3 py-1.5 text-white/70">Service</div>
              <div className="px-3 py-1.5 text-white/70">HRMS</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/80">
            {/* <Search className="w-4 h-4" />
            <Bell className="w-4 h-4" /> */}
            <Settings className="w-4 h-4" />
            <CircleUser className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-1">Dashboard</h2>
            <p className="text-sm text-white/70">Your SaaS at a glance</p>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white/20 border border-white/20 p-4 rounded-lg shadow-sm backdrop-blur-md">
                <div className="w-8 h-8 rounded-lg bg-white/30 mb-3" />
                <div className="h-6 w-12 bg-white/50 rounded mb-2" />
                <div className="h-4 w-24 bg-white/30 rounded" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white/20 border border-white/20 rounded-lg p-4 shadow-sm backdrop-blur-md">
              <div className="h-5 w-32 bg-white/50 rounded mb-6" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-4">
                    <div className="h-4 w-24 bg-white/40 rounded" />
                    <div className="h-2 w-full bg-white/30 rounded mt-1" />
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-1 bg-white/20 border border-white/20 rounded-lg p-4 shadow-sm backdrop-blur-md">
              <div className="h-5 w-24 bg-white/50 rounded mb-6" />
              <div className="h-32 w-full bg-white/10 rounded-lg border border-white/20 border-dashed flex items-center justify-center">
                <div className="h-4 w-32 bg-white/30 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Preview Card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-sm">
        <div className="bg-white dark:bg-[#111317] border border-slate-200 dark:border-slate-800/60 rounded-xl p-2 shadow-2xl shadow-black/20 dark:shadow-black">
           <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
             {logoUrl ? (
               <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm relative shrink-0">
                 <Image src={logoUrl} alt="Logo" fill className="object-cover" />
               </div>
             ) : (
               <div className="w-10 h-10 shrink-0 rounded-lg bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] flex items-center justify-center text-white font-semibold text-lg shadow-sm">
                 {initial}
               </div>
             )}
             <div className="flex flex-col overflow-hidden w-full">
               <span className="text-slate-800 dark:text-white font-medium flex items-center gap-2">
                 {displayCompany}
                 <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
               </span>
               <div className="flex items-center gap-1.5 mt-0.5">
                  {/* <div className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px] text-slate-600 dark:text-slate-300 font-mono flex items-center gap-1">
                    <span className="opacity-70 dark:opacity-50 border border-slate-300 dark:border-slate-600 rounded px-1">app</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">leadgaze.com/</span> */}
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-medium">{slug || 'workspace'}</span>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

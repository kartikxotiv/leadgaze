'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Briefcase,
  Check,
  Headphones,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';

import pathsConfig from '~/config/paths.config';
// eslint-disable-line @typescript-eslint/no-unused-vars
import { useWorkspaceCheck } from '~/lib/rbac/use-workspace-check';

export default function WorkspaceSetupPage() {
  const router = useRouter();
  const { data: user, isPending: _isPending } = useUser();
  const queryClient = useQueryClient();

  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'create'>('info');

  const { hasWorkspace, isLoading: isCheckLoading } = useWorkspaceCheck();

  // If user already has a workspace, redirect to home
  useEffect(() => {
    if (hasWorkspace === true && !isCheckLoading) {
      router.push(pathsConfig.app.home);
    }
  }, [hasWorkspace, isCheckLoading, router]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();

      // Get user's account
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', user?.id)
        .single();

      if (accountError || !accountData) {
        setError('Failed to get account information');
        setLoading(false);
        return;
      }

      // Create workspace via API route
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workspaceName,
          owner_id: accountData.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create workspace');
        setLoading(false);
        return;
      }

      // Manually set the workspace check query to true immediately to avoid redirect loops
      if (user?.id) {
        queryClient.setQueryData(['userHasWorkspace', user.id], true);
      }

      // Invalidate both queries to trigger a refresh in the background
      queryClient.invalidateQueries({
        queryKey: ['userHasWorkspace', user?.id],
      });

      queryClient.invalidateQueries({
        queryKey: ['userWorkspaces', user?.id],
      });

      // Redirect to module selector so the user can choose which module to enter
      router.push('/org/home');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-4 py-12">
      {/* Subtle background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[var(--color-leadgaze-primary)] opacity-[0.04] blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[var(--color-leadgaze-primary)] opacity-[0.04] blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-leadgaze-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-leadgaze-primary) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative w-full max-w-[28rem]">
        {/* Logo & Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <Image
            src="/images/lead-gaze-logo-main-screen.png"
            alt="Leadgaze"
            width={180}
            height={60}
            className="h-12 w-auto"
            priority
          />
        </div>

        {step === 'info' ? (
          // ─── Information Step ─────────────────────────────────
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
            {/* Hero */}
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] shadow-[var(--color-leadgaze-primary)]/20 shadow-lg">
                <Briefcase className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-800">
                Welcome to Leadgaze
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Your all-in-one platform for Sales, HR, and Service operations.
                Create a workspace to get started.
              </p>
            </div>

            {/* Module cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: TrendingUp,
                  title: 'Sales\nCRM',
                  desc: 'Leads, deals & pipeline',
                },
                {
                  icon: Users,
                  title: 'HRMS',
                  desc: 'People & operations',
                },
                {
                  icon: Headphones,
                  title: 'Service\nCloud',
                  desc: 'Tickets & support',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="group rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm transition-all hover:border-[var(--color-leadgaze-primary)]/20 hover:shadow-md"
                  >
                    <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-leadgaze-primary)]/8 text-[var(--color-leadgaze-primary)] transition-colors group-hover:bg-[var(--color-leadgaze-primary)]/12">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-xs leading-tight font-medium whitespace-pre-line text-slate-700">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Benefits list */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-slate-800">
                Everything you need, unified
              </h3>
              <div className="space-y-3">
                {[
                  {
                    title: 'Sales Pipeline & CRM',
                    desc: 'Manage leads, contacts, and close deals faster',
                  },
                  {
                    title: 'HR & Workforce Management',
                    desc: 'Onboard employees, track leave, and manage teams',
                  },
                  {
                    title: 'Service & Support Cloud',
                    desc: 'Handle tickets, SLAs, and customer support',
                  },
                  {
                    title: 'Role-Based Access & Collaboration',
                    desc: 'Invite your team with granular permissions per module',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={() => setStep('create')}
              size="lg"
              className="h-12 w-full gap-2 bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] text-sm font-semibold text-white shadow-[var(--color-leadgaze-primary)]/25 shadow-lg hover:shadow-[var(--color-leadgaze-primary)]/30 hover:shadow-xl"
            >
              Create Your Workspace
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-center text-xs text-slate-400">
              You can create additional workspaces later in settings
            </p>
          </div>
        ) : (
          // ─── Creation Step ────────────────────────────────────
          <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500">
            <div className="text-center">
              <h2 className="text-[1.75rem] font-bold tracking-tight text-slate-800">
                Name Your Workspace
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Choose a name for your team or organization
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleCreateWorkspace} className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Workspace Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Sales Team, Marketing, Enterprise"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={loading}
                    required
                    minLength={3}
                    maxLength={100}
                    className="h-11 border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-[var(--color-leadgaze-primary)] focus-visible:ring-[var(--color-leadgaze-primary)]/20"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    3–100 characters. Use a descriptive name for your team or
                    department.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !workspaceName.trim()}
                  size="lg"
                  className="h-12 w-full gap-2 bg-[linear-gradient(135deg,var(--color-leadgaze-primary)_0%,#283BA4_100%)] text-sm font-semibold text-white shadow-[var(--color-leadgaze-primary)]/25 shadow-lg hover:shadow-[var(--color-leadgaze-primary)]/30 hover:shadow-xl disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Workspace...
                    </>
                  ) : (
                    <>
                      Create Workspace
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setStep('info')}
                disabled={loading}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
              >
                ← Back to overview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

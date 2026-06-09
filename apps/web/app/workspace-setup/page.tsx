'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Briefcase, CheckCircle2, Loader2 } from 'lucide-react';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Input } from '@kit/ui/input';

import pathsConfig from '~/config/paths.config';
import { useWorkspaceCheck } from '~/lib/rbac/use-workspace-check';

export default function WorkspaceSetupPage() {
  const router = useRouter();
  const { data: user, isPending } = useUser();
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500 opacity-10 mix-blend-multiply blur-3xl filter"></div>
        <div className="animate-blob animation-delay-2000 absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500 opacity-10 mix-blend-multiply blur-3xl filter"></div>
        <div className="animate-blob animation-delay-4000 absolute top-1/2 left-1/2 h-80 w-80 rounded-full bg-pink-500 opacity-10 mix-blend-multiply blur-3xl filter"></div>
      </div>

      <div className="relative w-full max-w-lg">
        {step === 'info' ? (
          // Information Step
          <div className="animate-in fade-in space-y-6 duration-500">
            <div className="mb-8 space-y-3 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-3">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white">
                Welcome to Leadgaze
              </h1>
              <p className="text-lg text-slate-400">
                Create your workspace to get started
              </p>
            </div>

            <div className="mb-8 grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 text-center transition-colors hover:border-slate-600/50">
                <div className="mb-2 flex justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-sm font-medium text-slate-300">
                  Team Collaboration
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 text-center transition-colors hover:border-slate-600/50">
                <div className="mb-2 flex justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-sm font-medium text-slate-300">
                  Full Control
                </p>
              </div>
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-4 text-center transition-colors hover:border-slate-600/50">
                <div className="mb-2 flex justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-sm font-medium text-slate-300">
                  Role-Based Access
                </p>
              </div>
            </div>

            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-white">
                  Your Workspace Benefits
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Everything you need to manage your CRM
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1 border-blue-500/50 bg-blue-500/20 text-blue-300">
                    ✓
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Manage Leads & Contacts
                    </p>
                    <p className="text-xs text-slate-400">
                      Organize and track all your business relationships
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1 border-purple-500/50 bg-purple-500/20 text-purple-300">
                    ✓
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Role-Based Permissions
                    </p>
                    <p className="text-xs text-slate-400">
                      Control who can access what with granular permissions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1 border-pink-500/50 bg-pink-500/20 text-pink-300">
                    ✓
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Team Collaboration
                    </p>
                    <p className="text-xs text-slate-400">
                      Invite team members and work together seamlessly
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => setStep('create')}
              size="lg"
              className="w-full border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              Create Workspace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-center text-xs text-slate-500">
              You can create additional workspaces later in settings
            </p>
          </div>
        ) : (
          // Creation Step
          <div className="animate-in fade-in space-y-6 duration-500">
            <div className="mb-8 space-y-2 text-center">
              <h2 className="text-2xl font-bold text-white">
                Create Your Workspace
              </h2>
              <p className="text-slate-400">Choose a name for your workspace</p>
            </div>

            <Card className="border-slate-700/50 bg-slate-800/50">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Workspace Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateWorkspace} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
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
                      className="border-slate-600 bg-slate-900/50 text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      3-100 characters. Use a descriptive name for your team or
                      department.
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !workspaceName.trim()}
                    size="lg"
                    className="w-full border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Workspace...
                      </>
                    ) : (
                      <>
                        Create Workspace
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setStep('info')}
                    disabled={loading}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

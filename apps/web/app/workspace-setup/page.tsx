'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Loader2, CheckCircle2, ArrowRight, Briefcase } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';

import pathsConfig from '~/config/paths.config';

export default function WorkspaceSetupPage() {
  const router = useRouter();
  const { data: user, isPending } = useUser();
  const queryClient = useQueryClient();
  
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'create'>('info');

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

      // Invalidate both queries to trigger a refresh
      await queryClient.invalidateQueries({ 
        queryKey: ['userHasWorkspace', user?.id] 
      });
      
      // Invalidate the RBAC workspaces query and wait for refetch
      await queryClient.invalidateQueries({ 
        queryKey: ['userWorkspaces', user?.id] 
      });

      // Redirect to home
      router.push(pathsConfig.app.home);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-lg">
        {step === 'info' ? (
          // Information Step
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center space-y-3 mb-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white">Welcome to Leadgaze</h1>
              <p className="text-slate-400 text-lg">Create your workspace to get started</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                <div className="flex justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-sm text-slate-300 font-medium">Team Collaboration</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                <div className="flex justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-sm text-slate-300 font-medium">Full Control</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                <div className="flex justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-sm text-slate-300 font-medium">Role-Based Access</p>
              </div>
            </div>

            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white">Your Workspace Benefits</CardTitle>
                <CardDescription className="text-slate-400">Everything you need to manage your CRM</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1 bg-blue-500/20 text-blue-300 border-blue-500/50">✓</Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Manage Leads & Contacts</p>
                    <p className="text-xs text-slate-400">Organize and track all your business relationships</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1 bg-purple-500/20 text-purple-300 border-purple-500/50">✓</Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Role-Based Permissions</p>
                    <p className="text-xs text-slate-400">Control who can access what with granular permissions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1 bg-pink-500/20 text-pink-300 border-pink-500/50">✓</Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Team Collaboration</p>
                    <p className="text-xs text-slate-400">Invite team members and work together seamlessly</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => setStep('create')}
              size="lg"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              Create Workspace
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            <p className="text-xs text-center text-slate-500">
              You can create additional workspaces later in settings
            </p>
          </div>
        ) : (
          // Creation Step
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-white">Create Your Workspace</h2>
              <p className="text-slate-400">Choose a name for your workspace</p>
            </div>

            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white text-lg">Workspace Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateWorkspace} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
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
                      className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">3-100 characters. Use a descriptive name for your team or department.</p>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !workspaceName.trim()}
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Workspace...
                      </>
                    ) : (
                      <>
                        Create Workspace
                        <ArrowRight className="ml-2 w-4 h-4" />
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

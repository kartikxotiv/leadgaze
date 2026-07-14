'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Loader2, LogOut, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function WorkspaceSelectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { workspaces, isLoading: isRBACLoading, selectWorkspace } = useRBAC();
  const signOutMutation = useSignOut();

  const isLoading = isUserLoading || isRBACLoading;

  const handleSelect = (workspaceId: string) => {
    selectWorkspace(workspaceId);
    toast.success('Launching workspace...');
    
    // Redirect to home after a brief delay for state synchronization
    setTimeout(() => {
      window.location.assign('/org/home');
    }, 800);
  };

  const handleSignOut = async () => {
    try {
      await signOutMutation.mutateAsync();
      queryClient.clear();
      localStorage.removeItem('currentWorkspaceId');
      window.location.assign('/auth/sign-in');
    } catch (err) {
      toast.error('Failed to sign out');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-zinc-100 to-blue-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border border-slate-200/60 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-xl backdrop-blur-sm">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-muted-foreground text-sm font-medium">
              Loading your workspaces...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to setup if logged in but has no workspaces
  if (!isLoading && user && workspaces.length === 0) {
    router.push('/workspace-setup');
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 via-slate-50 to-blue-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-lg border border-slate-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 shadow-2xl backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="text-center space-y-2 pt-8 pb-6 border-b border-slate-100 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40">
          <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex h-12 w-12 items-center justify-center rounded-xl shadow-inner mb-2">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white block text-center justify-center w-full">
            Welcome back!
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-zinc-400 text-xl max-w-sm mx-auto">
            Choose a workspace
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {workspaces.map((workspace) => {
              const roleName = workspace?.role?.role_name || 'Member';
              const isAdmin = workspace?.role?.role_key === 'admin';
              
              return (
                <button
                  key={workspace.id}
                  onClick={() => handleSelect(workspace.id)}
                  className="group flex w-full items-center justify-between p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800/60 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 text-left outline-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-slate-100 dark:bg-zinc-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 text-slate-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-800 dark:text-zinc-100 truncate text-sm sm:text-base">
                        {workspace.name}
                      </h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium mt-1 ${
                        isAdmin 
                          ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200/30' 
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                      }`}>
                        {roleName}
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transform group-hover:translate-x-1 transition-all duration-200 pl-2">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => router.push('/workspace-setup')}
              className="flex-1 gap-2 border-dashed border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50"
            >
              <Plus className="h-4 w-4" />
              <span>Create Workspace</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={signOutMutation.isPending}
              className="flex-1 gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 hover:border-red-200 dark:hover:border-red-900/30"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import {
  acceptInviteService,
  validateInviteTokenService,
} from '~/services/team-members.service';

interface InvitationData {
  id: string;
  email: string;
  product_key?: string | null;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: {
    id: string;
    role_name: string;
  };
}

const INVITE_PRODUCT_ROUTES: Record<string, string> = {
  sales: '/home/sales',
  hrms: '/home/hrms',
  inventory: '/home/inventory',
  service_cloud: '/home/services',
  funds: '/home/funds',
};

function getInviteRedirectPath(productKey?: string | null) {
  if (!productKey) return '/home';

  return INVITE_PRODUCT_ROUTES[productKey] ?? '/home';
}

export default function InviteAcceptancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate invite token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        const response = await validateInviteTokenService(token);

        if (response.data) {
          setInvitation(response.data);
        }
      } catch (err: any) {
        setError(err?.message || 'Invalid or expired invitation');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  // Redirect to signup if not logged in
  useEffect(() => {
    if (!user && token && !loading) {
      const nextPath = encodeURIComponent(`/invite?token=${token}`);
      router.push(`/auth/sign-up?next=${nextPath}`);
    }
  }, [user, token, loading, router]);

  // Accept invite mutation
  const acceptMutation = useMutation({
    mutationFn: () => {
      if (!user?.sub || !token) {
        throw new Error('User or token not found');
      }
      return acceptInviteService(token, user.sub);
    },
    onSuccess: async (data) => {
      // Invalidate workspace-related queries to ensure UI updates automatically
      // We await these to ensure they are processed before we navigate
      await queryClient.invalidateQueries({ queryKey: ['userWorkspaces'] });
      await queryClient.invalidateQueries({ queryKey: ['userHasWorkspace'] });

      toast.success('Invitation accepted! Redirecting to workspace...');

      // Redirect to workspace
      const workspace = data.data?.workspace;
      if (workspace) {
        const productKey = data.data?.product_key ?? invitation?.product_key;
        const redirectPath = getInviteRedirectPath(productKey);

        if (productKey) {
          localStorage.setItem('selected_module', productKey);
        }

        // Use window.location.assign for a full page refresh which ensures
        // all client-side and server-side state is correctly updated.
        setTimeout(() => {
          window.location.assign(redirectPath);
        }, 1500);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to accept invitation');
      setError(error?.message || 'Failed to accept invitation');
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">
              Validating your invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">No invitation found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not logged in, show redirecting message
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 pt-6">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Redirecting to signup...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Workspace Invitation</CardTitle>
          <CardDescription>
            You've been invited to join a workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                Workspace
              </p>
              <p className="text-lg font-semibold">
                {invitation.workspace.name}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                Your Role
              </p>
              <p className="text-lg font-semibold">
                {invitation.role.role_name}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm font-medium">
                Invitation for
              </p>
              <p className="text-base">{invitation.email}</p>
            </div>
          </div>

          <div className="space-y-3 border-t pt-6">
            <Button
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending}
              className="w-full gap-2"
            >
              {acceptMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Accept Invitation
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              disabled={acceptMutation.isPending}
              className="w-full"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

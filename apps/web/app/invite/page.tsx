'use client';

import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useMutation } from '@tanstack/react-query';
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

export default function InviteAcceptancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user } = useUser();
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
      console.log({ token });

      try {
        const response = await validateInviteTokenService(token);
        console.log({ response });
        if (response.data) {
          setInvitation(response.data);
        }
      } catch (err: any) {
        console.log({ err });
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
      router.push(`/auth/sign-up?invite=${token}`);
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
    onSuccess: (data) => {
      toast.success('Invitation accepted! Redirecting to workspace...');
      // Redirect to workspace
      const workspace = data.data?.workspace;
      if (workspace) {
        setTimeout(() => {
          router.push(`/workspace/${workspace.slug}`);
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

'use client';

import { useMutation } from '@tanstack/react-query';
import { UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';

import { exitImpersonationService } from '~/services/impersonation.service';

export function ImpersonationBanner({
  targetName,
  reason,
}: {
  targetName: string;
  reason?: string;
  sessionId?: string;
}) {
  const exitMutation = useMutation({
    mutationFn: () => exitImpersonationService(),
    onSuccess: () => {
      toast.success('Impersonation session ended');
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
      window.location.href = `${adminUrl}/users`;
    },
    onError: (err: unknown) => {
      console.error('Exit impersonation error:', err);
      toast.error('Failed to end impersonation session');
    },
  });

  return (
    <div className="sticky top-0 z-50 flex shrink-0 items-center justify-between bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-md">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4" />
        <span>
          You are currently impersonating <strong>{targetName}</strong>
          {reason ? ` (${reason})` : ''}
        </span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => exitMutation.mutate()}
        disabled={exitMutation.isPending}
        className="h-7 border-none bg-white text-xs font-semibold text-amber-900 hover:bg-amber-50"
      >
        <X className="mr-1 h-3.5 w-3.5" />
        {exitMutation.isPending ? 'Ending…' : 'Exit Impersonation'}
      </Button>
    </div>
  );
}

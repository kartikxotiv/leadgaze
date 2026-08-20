'use client';

import Link from 'next/link';

import { LockKeyhole } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';

export function UpgradePrompt({
  title = 'Upgrade required',
  description,
  recommendedPlan = 'Growth',
  compact = false,
}: {
  title?: string;
  description?: string;
  recommendedPlan?: string;
  compact?: boolean;
}) {
  return (
    <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30">
      <CardContent
        className={compact ? 'flex items-center gap-3 p-4' : 'space-y-4 p-6'}
      >
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-muted-foreground text-sm">
              {description ??
                `This capability is available on the ${recommendedPlan} plan.`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/org/subscription">Upgrade now</Link>
          </Button>
          {!compact && (
            <Button asChild size="sm" variant="outline">
              <Link href="/pricing">Compare plans</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

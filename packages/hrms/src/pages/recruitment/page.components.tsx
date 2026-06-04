import type { ReactNode } from 'react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

function getStatusClassName(label: string) {
  const value = label.toLowerCase();

  if (
    value.includes('accepted') ||
    value.includes('completed') ||
    value.includes('hired') ||
    value.includes('open') ||
    value.includes('active')
  ) {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  if (
    value.includes('draft') ||
    value.includes('pending') ||
    value.includes('screening') ||
    value.includes('shortlisted') ||
    value.includes('approval')
  ) {
    return 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  if (
    value.includes('cancelled') ||
    value.includes('declined') ||
    value.includes('rejected') ||
    value.includes('withdrawn') ||
    value.includes('expired') ||
    value.includes('blocked') ||
    value.includes('closed')
  ) {
    return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300';
  }

  return 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300';
}

export function RecruitmentSummaryCards(props: {
  items: Array<{
    label: string;
    value: string;
    hint: string;
    icon?: ReactNode;
  }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            </div>
            {item.icon ? (
              <div className="text-muted-foreground rounded-xl border p-2">
                {item.icon}
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RecruitmentStatusBadge(props: { label: string }) {
  return (
    <Badge variant="outline" className={getStatusClassName(props.label)}>
      {props.label}
    </Badge>
  );
}

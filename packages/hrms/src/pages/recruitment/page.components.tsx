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
  const iconColors = [
    'bg-primary',
    'bg-activity-5',
    'bg-activity-4',
    'bg-activity-3',
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item, index) => (
        <Card
          key={item.label}
          className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32"
        >
          <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
            <div className="space-y-1">
              <CardDescription className="secondary-text-small text-leadgaze-muted dark:text-white">
                {item.label}
              </CardDescription>
              <CardTitle className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
                {item.value}
              </CardTitle>
            </div>
            {item.icon ? (
              <div
                className={`flex h-8 w-8 items-center justify-center rounded text-white [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-white ${iconColors[index % iconColors.length]}`}
              >
                {item.icon}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
            <p className="secondary-text-small text-leadgaze-success">
              {item.hint}
            </p>
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

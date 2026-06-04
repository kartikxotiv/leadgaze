'use client';

import type { ComponentType } from 'react';

import { FileText } from 'lucide-react';

import { Card, CardContent } from '@kit/ui/card';

export function DocumentsSummaryCards(props: {
  summary: {
    totalCount: number;
  };
}) {
  return (
    <div className={'grid gap-4 md:grid-cols-2 xl:grid-cols-4'}>
      <SummaryCard
        icon={FileText}
        label={'Total Documents'}
        value={props.summary.totalCount}
      />
    </div>
  );
}

function SummaryCard(props: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  const Icon = props.icon;

  return (
    <Card>
      <CardContent className={'flex items-center gap-4 p-2'}>
        <div
          className={
            'bg-muted flex items-center justify-center rounded-xl p-2.5'
          }
        >
          <Icon className={'h-4 w-4'} />
        </div>
        <div>
          <p className={'text-muted-foreground text-sm'}>{props.label}</p>
          <p className={'text-lg font-semibold'}>{props.value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

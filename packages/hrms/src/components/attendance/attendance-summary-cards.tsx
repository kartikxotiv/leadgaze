'use client';

import type { ComponentType } from 'react';

import { CheckCircle2, Clock, Users, XCircle } from 'lucide-react';

import { Card, CardContent } from '@kit/ui/card';

export function AttendanceSummaryCards(props: {
  summary: {
    present: number;
    absent: number;
    inProgress: number;
    total: number;
  };
}) {
  return (
    <div className={'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'}>
      <SummaryCard
        label={'Present'}
        value={props.summary.present}
        icon={CheckCircle2}
        iconClassName={'text-green-600'}
        iconBgClassName={'bg-green-500/10'}
      />
      <SummaryCard
        label={'Absent'}
        value={props.summary.absent}
        icon={XCircle}
        iconClassName={'text-red-600'}
        iconBgClassName={'bg-red-500/10'}
      />
      <SummaryCard
        label={'In Progress'}
        value={props.summary.inProgress}
        icon={Clock}
        iconClassName={'text-sky-600'}
        iconBgClassName={'bg-sky-500/10'}
      />
      <SummaryCard
        label={'Total'}
        value={props.summary.total}
        icon={Users}
        iconClassName={'text-foreground'}
        iconBgClassName={'bg-muted'}
      />
    </div>
  );
}

function SummaryCard(props: {
  icon: ComponentType<{ className?: string }>;
  iconBgClassName: string;
  iconClassName: string;
  label: string;
  value: number;
}) {
  const Icon = props.icon;

  return (
    <Card className={'shadow-sm'}>
      <CardContent className={'flex items-center gap-4 p-2'}>
        <div className={`${props.iconBgClassName} rounded-full p-1.5`}>
          <Icon className={`h-4 w-4 ${props.iconClassName}`} />
        </div>
        <div>
          <p className={'text-lg font-bold'}>{props.value}</p>
          <p className={'text-muted-foreground text-sm font-medium'}>
            {props.label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

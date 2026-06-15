'use client';

import type { ComponentType } from 'react';

import { Building2, MailPlus, ShieldCheck, Users } from 'lucide-react';

import { Card, CardContent } from '@kit/ui/card';

export function EmployeesSummaryCards(props: {
  summary: {
    activeCount: number;
    departmentCoverage: number;
    invitedCount: number;
    totalCount: number;
  };
}) {
  return (
    <div className={'grid gap-4 md:grid-cols-2 xl:grid-cols-4'}>
      <SummaryCard
        icon={Users}
        label={'Total Employees'}
        value={props.summary.totalCount}
      />
      <SummaryCard
        icon={ShieldCheck}
        label={'Active Employees'}
        value={props.summary.activeCount}
      />
      <SummaryCard
        icon={MailPlus}
        label={'Pending Invites'}
        value={props.summary.invitedCount}
      />
      <SummaryCard
        icon={Building2}
        label={'Departments Covered'}
        value={props.summary.departmentCoverage}
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
        <div className={'bg-muted flex p-2.5 items-center justify-center rounded-xl'}>
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

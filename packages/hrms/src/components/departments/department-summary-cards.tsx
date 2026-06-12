'use client';

import type { ComponentType } from 'react';

import {
  Building2,
  GitBranch,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { Card, CardContent } from '@kit/ui/card';

type DepartmentSummary = {
  activeCount: number;
  assignedHeadsCount: number;
  rootCount: number;
  totalCount: number;
};

export function DepartmentSummaryCards(props: {
  summary: DepartmentSummary;
}) {
  return (
    <div className={'grid gap-4 md:grid-cols-2 xl:grid-cols-4'}>
      <SummaryCard
        icon={Building2}
        label={'Total Departments'}
        value={props.summary.totalCount}
      />
      <SummaryCard
        icon={ShieldCheck}
        label={'Active Departments'}
        value={props.summary.activeCount}
      />
      <SummaryCard
        icon={GitBranch}
        label={'Root Departments'}
        value={props.summary.rootCount}
      />
      <SummaryCard
        icon={Search}
        label={'Heads Assigned'}
        value={props.summary.assignedHeadsCount}
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

'use client';

import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { RecruitmentSummaryCards } from '../page.components';

type OverviewItem = {
  hint: string;
  label: string;
  value: string;
};

type MetricItem = OverviewItem & {
  icon: ReactNode;
};

export function RecruitmentOverview(props: {
  candidateStageCards: OverviewItem[];
  metricsItems: MetricItem[];
}) {
  return (
    <>
      <RecruitmentSummaryCards items={props.metricsItems} />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {props.candidateStageCards.slice(0, 5).map((item) => (
          <Card key={item.label} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

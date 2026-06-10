'use client';

import type { ReactNode } from 'react';

import { CircleDot } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { RecruitmentSummaryCards } from '../../pages/recruitment/page.components';

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
  const stageColors = [
    'bg-primary',
    'bg-activity-5',
    'bg-activity-4',
    'bg-activity-3',
    'bg-activity-2',
  ];

  return (
    <>
      <RecruitmentSummaryCards items={props.metricsItems} />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {props.candidateStageCards.slice(0, 5).map((item, index) => (
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
              <div
                className={`flex h-8 w-8 items-center justify-center rounded ${stageColors[index % stageColors.length]}`}
              >
                <CircleDot className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
              <p className="secondary-text-small text-leadgaze-success">
                {item.hint}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

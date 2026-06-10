'use client';

import Link from 'next/link';

import { ChevronRight, type LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { cn } from '@kit/ui/utils';

type Trend = 'up' | 'down' | 'neutral';

const COLORS = [
  'var(--color-activity-1)',
  'var(--color-activity-2)',
  'var(--color-activity-3)',
  'var(--color-activity-4)',
  'var(--color-activity-5)',
];

export function HrmsStatCard(props: {
  title: string;
  value: string;
  subtitle: string;
  trend: Trend;
  icon: React.ReactNode;
}) {
  return (
    <Card className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
        <div className="space-y-1">
          <CardTitle className="secondary-text-small text-leadgaze-muted dark:text-white">
            {props.title}
          </CardTitle>
          <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
            {props.value}
          </div>
        </div>

        <div className="bg-primary flex h-8 w-8 items-center justify-center rounded">
          {props.icon}
        </div>
      </CardHeader>

      <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
        <p
          className={cn('secondary-text-small', {
            'text-leadgaze-success': props.trend === 'up',
            'text-amber-600': props.trend === 'down',
            'text-leadgaze-muted': props.trend === 'neutral',
          })}
        >
          {props.subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

export function PendingActionsPanel(props: {
  title: string;
  icon?: React.ReactNode;
  items: Array<{ label: string; count: number; highlight?: boolean }>;
  ctaLabel: string;
}) {
  return (
    <CardWidgetContainer
      title={props.title}
      icon2={props.icon}
      contentClassName="p-0"
    >
      <div className="divide-y dark:divide-zinc-800">
        {props.items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 p-5 xl:p-3 2xl:p-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn('h-2.5 w-2.5 rounded-full', {
                  'bg-activity-4': item.highlight,
                  'bg-activity-5': !item.highlight,
                })}
              />
              <span className="primary-text-medium text-leadgaze-dark truncate dark:text-zinc-200">
                {item.label}
              </span>
            </div>

            <span
              className={cn(
                'flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold',
                {
                  'border border-amber-200 bg-amber-50 text-amber-700':
                    item.highlight,
                  'bg-muted text-muted-foreground': !item.highlight,
                },
              )}
            >
              {item.count}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="text-primary hover:text-primary/80 mx-5 my-4 inline-flex items-center gap-1 text-sm font-semibold transition-colors xl:mx-3 2xl:mx-5"
      >
        {props.ctaLabel}
        <ChevronRight className="h-4 w-4" />
      </button>
    </CardWidgetContainer>
  );
}

export function RecentJoinersPanel(props: {
  title: string;
  icon?: React.ReactNode;
  items: Array<{
    initials: string;
    name: string;
    meta: string;
    status: 'Active' | 'Probation';
  }>;
}) {
  return (
    <CardWidgetContainer
      title={props.title}
      icon2={props.icon}
      contentClassName="p-0"
    >
      {props.items.length === 0 ? (
        <EmptyPanelText>No recent joiners yet.</EmptyPanelText>
      ) : (
        <div className="divide-y dark:divide-zinc-800">
          {props.items.map((item) => (
            <div
              key={`${item.name}-${item.meta}`}
              className="flex items-center justify-between gap-4 p-5 xl:p-3 2xl:p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded text-xs font-semibold">
                  {item.initials}
                </div>

                <div className="min-w-0">
                  <p className="primary-text-medium text-leadgaze-dark truncate dark:text-zinc-200">
                    {item.name}
                  </p>
                  <p className="secondary-text-small text-leadgaze-muted truncate dark:text-white">
                    {item.meta}
                  </p>
                </div>
              </div>

              <span className="rounded-full border px-2.5 py-1 text-xs font-semibold">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </CardWidgetContainer>
  );
}

export function QuickActionsPanel(props: {
  title: string;
  items: Array<{
    label: string;
    icon: LucideIcon;
    href: string;
    color?: string;
  }>;
}) {
  return (
    <CardWidgetContainer
      title={props.title}
      contentClassName="grid grid-cols-2 gap-3 p-4"
    >
      {props.items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="hover:bg-muted/50 flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center transition-colors"
        >
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded">
            <item.icon
              className={cn('h-5 w-5', item.color ?? 'text-primary')}
            />
          </div>
          <span className="secondary-text-small text-leadgaze-muted">
            {item.label}
          </span>
        </Link>
      ))}
    </CardWidgetContainer>
  );
}

export function AttendanceTrendChart(props: {
  title: string;
  icon?: React.ReactNode;
  data: Array<{ date: string; present: number; total: number }>;
}) {
  const maxTotal = Math.max(...props.data.map((item) => item.total), 1);

  return (
    <CardWidgetContainer
      title={props.title}
      icon2={props.icon}
      contentClassName="p-4"
      className="xl:col-span-2"
    >
      {props.data.length === 0 ? (
        <EmptyPanelText>No attendance data available.</EmptyPanelText>
      ) : (
        <div className="flex h-72 items-end gap-3">
          {props.data.map((item, index) => {
            const height = Math.max((item.present / maxTotal) * 100, 4);

            return (
              <div
                key={item.date}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div className="bg-muted/40 flex h-52 w-full items-end rounded-lg p-1">
                  <div
                    className="w-full rounded-md transition-all"
                    style={{
                      backgroundColor: COLORS[index % COLORS.length],
                      height: `${height}%`,
                    }}
                  />
                </div>
                <span className="secondary-text-small text-leadgaze-muted">
                  {item.date}
                </span>
                <span className="text-xs font-medium">{item.present}</span>
              </div>
            );
          })}
        </div>
      )}
    </CardWidgetContainer>
  );
}

export function DepartmentDistributionChart(props: {
  title: string;
  icon?: React.ReactNode;
  data: Array<{ name: string; count: number }>;
}) {
  const maxCount = Math.max(...props.data.map((item) => item.count), 1);

  return (
    <CardWidgetContainer
      title={props.title}
      icon2={props.icon}
      contentClassName="space-y-4 p-4"
    >
      {props.data.length === 0 ? (
        <EmptyPanelText>No department data available.</EmptyPanelText>
      ) : (
        props.data.map((item, index) => (
          <div key={item.name} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="primary-text-medium text-leadgaze-dark truncate dark:text-white">
                  {item.name}
                </span>
              </div>
              <span className="primary-text-regular text-leadgaze-muted dark:text-white">
                {item.count}
              </span>
            </div>
            <div className="bar-bg h-2 w-full overflow-hidden rounded-full">
              <div
                className="h-full transition-all duration-500"
                style={{
                  backgroundColor: COLORS[index % COLORS.length],
                  width: `${(item.count / maxCount) * 100}%`,
                }}
              />
            </div>
          </div>
        ))
      )}
    </CardWidgetContainer>
  );
}

function EmptyPanelText(props: { children: string }) {
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
      {props.children}
    </div>
  );
}

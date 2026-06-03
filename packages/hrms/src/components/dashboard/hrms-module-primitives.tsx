import type { ReactNode } from 'react';

import { ArrowUpRight } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { cn } from '@kit/ui/utils';

export function ModuleHeroCard(props: {
  title: string;
  description: string;
  badge: string;
  eyebrow?: string;
  metrics: Array<{
    label: string;
    value: string;
    hint: string;
  }>;
}) {
  return (
    <Card className="overflow-hidden border-none bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50 shadow-sm">
      <CardContent className="grid gap-8 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-white/12 text-white hover:bg-white/12">
              {props.badge}
            </Badge>
            {props.eyebrow ? (
              <span className="text-xs font-medium tracking-[0.24em] text-slate-300 uppercase">
                {props.eyebrow}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-balance lg:text-3xl">
              {props.title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300 lg:text-base">
              {props.description}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {props.metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm"
            >
              <p className="text-sm text-slate-300">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight">
                {metric.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                {metric.hint}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryMetricCard(props: {
  title: string;
  value: string;
  hint: string;
  accent?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate';
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div
          className={cn('h-1.5 w-14 rounded-full', {
            'bg-emerald-500': props.accent === 'emerald',
            'bg-amber-500': props.accent === 'amber',
            'bg-sky-500': props.accent === 'sky',
            'bg-rose-500': props.accent === 'rose',
            'bg-slate-500': !props.accent || props.accent === 'slate',
          })}
        />
        <div>
          <p className="text-muted-foreground text-sm">{props.title}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {props.value}
          </p>
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            {props.hint}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionCard(props: {
  title: string;
  description?: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle>{props.title}</CardTitle>
          {props.description ? (
            <CardDescription>{props.description}</CardDescription>
          ) : null}
        </div>

        {props.actionLabel ? (
          <div className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
            <span>{props.actionLabel}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        ) : null}
      </CardHeader>

      <CardContent>{props.children}</CardContent>
    </Card>
  );
}

export function ProgressPanel(props: {
  title: string;
  description: string;
  value: number;
  footer: string;
  tone?: 'emerald' | 'amber' | 'sky';
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{props.title}</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {props.description}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn({
            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300':
              props.tone === 'emerald',
            'bg-amber-500/10 text-amber-700 dark:text-amber-300':
              props.tone === 'amber',
            'bg-sky-500/10 text-sky-700 dark:text-sky-300':
              !props.tone || props.tone === 'sky',
          })}
        >
          {props.value}%
        </Badge>
      </div>

      <div className="bg-primary/10 mt-4 h-2.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${props.value}%` }}
        />
      </div>

      <p className="text-muted-foreground mt-3 text-xs">{props.footer}</p>
    </div>
  );
}

export function InfoList(props: {
  items: Array<{
    label: string;
    value: string;
    hint?: string;
    tone?: 'default' | 'positive' | 'warning' | 'critical';
  }>;
}) {
  return (
    <div className="space-y-3">
      {props.items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="flex items-start justify-between gap-4 rounded-2xl border p-4"
        >
          <div>
            <p className="text-sm font-medium">{item.label}</p>
            {item.hint ? (
              <p className="text-muted-foreground mt-1 text-xs leading-5">
                {item.hint}
              </p>
            ) : null}
          </div>

          <Badge
            variant={item.tone === 'default' ? 'secondary' : 'outline'}
            className={cn('shrink-0', {
              'border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300':
                item.tone === 'positive',
              'border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:text-amber-300':
                item.tone === 'warning',
              'border-rose-200 bg-rose-500/10 text-rose-700 dark:border-rose-500/40 dark:text-rose-300':
                item.tone === 'critical',
            })}
          >
            {item.value}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function KeyValueGrid(props: {
  items: Array<{
    label: string;
    value: string;
    hint?: string;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {props.items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="rounded-2xl border p-4"
        >
          <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
            {item.label}
          </p>
          <p className="mt-2 text-lg font-semibold tracking-tight">
            {item.value}
          </p>
          {item.hint ? (
            <p className="text-muted-foreground mt-2 text-xs leading-5">
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

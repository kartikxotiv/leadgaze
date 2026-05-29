'use client';

import { ChevronRight, type LucideIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';

type Trend = 'up' | 'down' | 'neutral';

export function HrmsStatCard(props: {
  title: string;
  value: string;
  subtitle: string;
  trend: Trend;
  icon: React.ReactNode;
}) {
  return (
    <Card className={'group rounded-xl border transition-all duration-300 hover:border-primary/30 hover:shadow-md'}>
      <CardContent className={'p-5'}>
        <div className={'mb-3 flex items-start justify-between'}>
          <div>
            <p className={'text-muted-foreground text-xs font-semibold tracking-wide uppercase'}>
              {props.title}
            </p>
            <p className={'mt-1 text-2xl font-semibold leading-none tracking-tight'}>
              {props.value}
            </p>
          </div>

          <div className={'bg-muted group-hover:bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300'}>
            {props.icon}
          </div>
        </div>

        <p
          className={cn('text-xs font-medium', {
            'text-emerald-600': props.trend === 'up',
            'text-amber-600': props.trend === 'down',
            'text-muted-foreground': props.trend === 'neutral',
          })}
        >
          {props.subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

function HrmsPanel(props: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('h-full rounded-xl border transition-all duration-300 hover:shadow-sm', props.className)}>
      <CardHeader className={'pb-3'}>
        <CardTitle className={'flex items-center gap-2 text-1xl font-semibold'}>
          {props.icon}
          {props.title}
        </CardTitle>
      </CardHeader>

      <CardContent>{props.children}</CardContent>
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
    <HrmsPanel title={props.title} icon={props.icon}>
      <div className={'space-y-3'}>
        {props.items.map((item) => (
          <div
            key={item.label}
            className={'bg-muted/70 hover:bg-muted/90 flex items-center justify-between rounded-xl px-4 py-3 transition-colors duration-300'}
          >
            <div className={'flex items-center gap-2'}>
              <span
                className={cn('h-2 w-2 rounded-full bg-transparent', {
                  'bg-red-500': item.highlight,
                })}
              />
              <span className={'text-sm font-medium'}>{item.label}</span>
            </div>

            <span
              className={cn(
                'flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold',
                {
                  'bg-red-500 text-white': item.highlight,
                  'bg-muted-foreground/15 text-foreground': !item.highlight,
                },
              )}
            >
              {item.count}
            </span>
          </div>
        ))}
      </div>

      <button
        type={'button'}
        className={'text-primary hover:text-primary/80 mt-4 inline-flex items-center gap-1 text-sm font-semibold transition-colors duration-300'}
      >
        {props.ctaLabel}
        <ChevronRight className={'h-4 w-4'} />
      </button>
    </HrmsPanel>
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
    <HrmsPanel title={props.title} icon={props.icon}>
      <div className={'space-y-3'}>
        {props.items.map((item) => (
          <div key={item.name} className={'hover:bg-muted/50 flex items-center justify-between rounded-lg p-1 transition-colors duration-300'}>
            <div className={'flex items-center gap-3'}>
              <div className={'bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold'}>
                {item.initials}
              </div>

              <div>
                <p className={'text-sm font-semibold'}>{item.name}</p>
                <p className={'text-muted-foreground text-xs'}>{item.meta}</p>
              </div>
            </div>

            <span className={'bg-muted rounded-full px-2.5 py-1 text-xs font-semibold'}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </HrmsPanel>
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
    <HrmsPanel title={props.title}>
      <div className={'grid grid-cols-2 gap-3'}>
        {props.items.map((item) => (
          <button
            key={item.label}
            onClick={() => window.location.href = item.href}
            className={'hover:bg-muted group flex flex-col items-center justify-center gap-2 rounded-xl border border-transparent p-4 transition-all duration-300 hover:border-border'}
          >
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-300 bg-muted group-hover:bg-primary/10')}>
              <item.icon className={cn('h-5 w-5', item.color || 'text-primary')} />
            </div>
            <span className={'text-xs font-medium text-muted-foreground'}>{item.label}</span>
          </button>
        ))}
      </div>
    </HrmsPanel>
  );
}

export function AttendanceTrendChart(props: {
  title: string;
  icon?: React.ReactNode;
  data: Array<{ date: string; present: number; total: number }>;
}) {
  return (
    <HrmsPanel title={props.title} icon={props.icon} className={'xl:col-span-2'}>
      <div className={'h-[240px] w-full mt-4'}>
        {props.data.length === 0 ? (
          <div className={'flex h-full items-center justify-center text-sm text-muted-foreground'}>
            No attendance data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={props.data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border) / 0.5)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'oklch(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'oklch(var(--muted-foreground))' }}
              />
              <Tooltip
                cursor={{ fill: 'oklch(var(--muted))', opacity: 0.2 }}
                contentStyle={{
                  borderRadius: '12px',
                  backgroundColor: 'oklch(var(--card))',
                  border: '1px solid oklch(var(--border))',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Bar
                dataKey="present"
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </HrmsPanel>
  );
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function DepartmentDistributionChart(props: {
  title: string;
  icon?: React.ReactNode;
  data: Array<{ name: string; count: number }>;
}) {
  return (
    <HrmsPanel title={props.title} icon={props.icon}>
      <div className={'h-[240px] w-full'}>
        {props.data.length === 0 ? (
          <div className={'flex h-full items-center justify-center text-sm text-muted-foreground'}>
            No department data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={props.data}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
              >
                {props.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  backgroundColor: 'oklch(var(--card))',
                  border: '1px solid oklch(var(--border))',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className={'mt-4 space-y-2'}>
        {props.data.map((item, index) => (
          <div key={item.name} className={'flex items-center justify-between text-xs font-medium'}>
            <div className={'flex items-center gap-2'}>
              <div className={'h-2 w-2 rounded-full'} style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className={'text-muted-foreground'}>{item.name}</span>
            </div>
            <span>{item.count}</span>
          </div>
        ))}
      </div>
    </HrmsPanel>
  );
}

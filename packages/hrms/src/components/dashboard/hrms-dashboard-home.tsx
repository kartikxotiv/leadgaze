'use client';

import Link from 'next/link';

import {
  AlarmClockCheck,
  Banknote,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  FileText,
  LifeBuoy,
  LogOut,
  type LucideIcon,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserSearch,
  Users,
  WalletCards,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { Skeleton } from '@kit/ui/skeleton';
import { cn } from '@kit/ui/utils';

import type {
  AttendanceTrendItem,
  DashboardModuleSignal,
  DepartmentStat,
  HomeDashboardData,
  RecentJoiner,
} from '../../types/home-dashboard.type';
import { useHomeDashboard } from './use-home-dashboard';

const modules = [
  {
    description: 'Profiles, reporting lines, and employment status.',
    href: '/home/hrms/employees',
    icon: Users,
    title: 'Employees',
  },
  {
    description: 'Teams aligned to the active Leadgaze workspace.',
    href: '/home/hrms/departments',
    icon: Building2,
    title: 'Departments',
  },
  {
    description: 'Employee files, certificates, and HR records.',
    href: '/home/hrms/documents',
    icon: FileText,
    title: 'Documents',
  },
  {
    description: 'Check-ins, shifts, and daily attendance records.',
    href: '/home/hrms/attendance',
    icon: CalendarCheck,
    title: 'Attendance',
  },
  {
    description: 'Requests, approvals, balances, and holidays.',
    href: '/home/hrms/leave',
    icon: ClipboardList,
    title: 'Leave',
  },
  {
    description: 'Requisitions, candidates, interviews, offers, onboarding.',
    href: '/home/hrms/recruitment',
    icon: UserSearch,
    title: 'Recruitment',
  },
  {
    description: 'Resignations, exit clearances, settlements, and letters.',
    href: '/home/hrms/separation',
    icon: LogOut,
    title: 'Separation',
  },
  {
    description: 'Employee HR requests, responses, and follow-up.',
    href: '/home/hrms/support-system',
    icon: LifeBuoy,
    title: 'Support System',
  },
  {
    description: 'Profile updates, HR requests, announcements, payslips.',
    href: '/home/hrms/self-service',
    icon: ShieldCheck,
    title: 'Self Service',
  },
  {
    description: 'Salary structures, runs, payslips, and approvals.',
    href: '/home/hrms/payroll',
    icon: WalletCards,
    title: 'Payroll',
  },
  {
    description: 'Attendance, leave, payroll, and workforce analytics.',
    href: '/home/hrms/reports',
    icon: FileBarChart,
    title: 'Reports',
  },
] satisfies Array<{
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
}>;

const quickActions = [
  {
    href: '/home/hrms/employees',
    icon: UserPlus,
    label: 'Add Employee',
  },
  {
    href: '/home/hrms/attendance',
    icon: AlarmClockCheck,
    label: 'Attendance',
  },
  {
    href: '/home/hrms/leave',
    icon: ClipboardList,
    label: 'Review Leave',
  },
  {
    href: '/home/hrms/payroll',
    icon: Banknote,
    label: 'Payroll',
  },
] satisfies Array<{ href: string; icon: LucideIcon; label: string }>;

export function HrmsDashboardHome(props: { workspaceName?: string | null }) {
  const { data, error, isError, isLoading } = useHomeDashboard();

  if (isLoading) {
    return <HrmsDashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <CardWidgetContainer
        title="Unable to load HRMS dashboard"
        description={
          error instanceof Error
            ? error.message
            : 'Something went wrong while loading HRMS metrics.'
        }
        contentClassName="hidden"
        icon2={<ShieldAlert className="text-leadgaze-muted h-5 w-5" />}
      >
        <div />
      </CardWidgetContainer>
    );
  }

  const attendanceRate = data.counts.activeEmployees
    ? Math.round((data.counts.presentToday / data.counts.activeEmployees) * 100)
    : 0;
  const metrics = [
    {
      description: `${data.counts.activeEmployees} active employees`,
      icon: Users,
      iconClassName: 'bg-primary',
      label: 'Total Employees',
      value: data.counts.totalEmployees.toLocaleString('en-IN'),
    },
    {
      description: `${attendanceRate}% attendance today`,
      icon: AlarmClockCheck,
      iconClassName: 'bg-activity-5',
      label: 'Present Today',
      value: data.counts.presentToday.toLocaleString('en-IN'),
    },
    {
      description: 'Approved leave covering today',
      icon: CalendarCheck,
      iconClassName: 'bg-activity-4',
      label: 'On Leave',
      value: data.counts.onLeaveToday.toLocaleString('en-IN'),
    },
    {
      description: data.payroll.latestRunName ?? 'No payroll run yet',
      icon: WalletCards,
      iconClassName: 'bg-activity-3',
      label: 'Pending Payroll',
      value: data.counts.pendingPayrollRuns.toLocaleString('en-IN'),
    },
  ];

  return (
    <div className="animate-in fade-in flex h-full flex-col overflow-y-auto p-0 pb-4 duration-500 xl:overflow-hidden xl:px-0 xl:pb-4 2xl:overflow-y-auto 2xl:p-0 2xl:pb-4">
      <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-3 xl:pb-4 2xl:grid-cols-4 2xl:gap-4 2xl:pb-6">
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3 2xl:grid-cols-4 2xl:gap-4">
        {quickActions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant="outline"
            className="h-13 flex-col gap-2 rounded-xl border-slate-100 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <Link href={action.href}>
              <div className="flex items-center gap-2 xl:gap-1.5 2xl:gap-2">
                <action.icon className="h-6 w-6 text-slate-500 xl:h-4 xl:w-4 2xl:h-6 2xl:w-6 dark:text-zinc-400" />
                <span className="text-[16px] font-semibold text-slate-700 xl:text-sm 2xl:text-[16px] dark:text-zinc-200">
                  {action.label}
                </span>
              </div>
            </Link>
          </Button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 xl:mt-4 xl:gap-4 2xl:mt-8 2xl:gap-8">
        <AttendanceTrendPanel data={data.attendanceTrend} />
        <PendingActionsPanel data={data} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 xl:mt-4 xl:gap-4 2xl:mt-8 2xl:gap-8">
        <DepartmentDistributionPanel departments={data.departmentStats} />
        <RecentJoinersPanel items={data.recentJoiners} />
      </div>

      <ModuleSignalGrid signals={data.moduleSignals} />

      <ModuleDirectory workspaceName={props.workspaceName} />
    </div>
  );
}

function DashboardMetricCard(props: {
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <Card className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
        <div className="space-y-1">
          <CardTitle className="secondary-text-small text-leadgaze-muted dark:text-white">
            {props.label}
          </CardTitle>
          <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
            {props.value}
          </div>
        </div>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded ${props.iconClassName}`}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
        <CardDescription className="secondary-text-small text-leadgaze-success">
          {props.description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

function AttendanceTrendPanel(props: { data: AttendanceTrendItem[] }) {
  const maxTotal = Math.max(...props.data.map((item) => item.total), 1);

  return (
    <CardWidgetContainer
      title="Attendance Trend"
      description="Present employees across the last seven days."
      icon2={<AlarmClockCheck className="text-leadgaze-muted h-5 w-5" />}
      contentClassName="p-4"
    >
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
                    backgroundColor: `var(--color-activity-${(index % 5) + 1})`,
                    height: `${height}%`,
                  }}
                />
              </div>
              <span className="secondary-text-small text-leadgaze-muted dark:text-white">
                {item.label}
              </span>
              <span className="text-xs font-medium">{item.present}</span>
            </div>
          );
        })}
      </div>
    </CardWidgetContainer>
  );
}

function PendingActionsPanel(props: { data: HomeDashboardData }) {
  const actions = [
    {
      href: '/home/hrms/leave',
      label: 'Leave approvals',
      value: props.data.counts.pendingActions.leaveRequests,
    },
    {
      href: '/home/hrms/support-system',
      label: 'Open support tickets',
      value: props.data.counts.pendingActions.supportRequests,
    },
    {
      href: '/home/hrms/payroll',
      label: 'Payroll runs pending',
      value: props.data.counts.pendingActions.payrollRuns,
    },
    {
      href: '/home/hrms/separation',
      label: 'Active separations',
      value: props.data.counts.pendingActions.separationItems,
    },
    {
      href: '/home/hrms/recruitment',
      label: 'Open requisitions',
      value: props.data.counts.pendingActions.recruitmentItems,
    },
  ];

  return (
    <CardWidgetContainer
      title="Pending Actions"
      description="Work queues that need HR attention."
      icon2={<ShieldAlert className="text-leadgaze-muted h-5 w-5" />}
      contentClassName="p-0"
    >
      <div className="divide-y dark:divide-zinc-800">
        {actions.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-slate-50/30 xl:p-3 2xl:p-5 dark:hover:bg-zinc-800/30"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn('h-2.5 w-2.5 rounded-full', {
                  'bg-activity-4': item.value > 0,
                  'bg-activity-5': item.value === 0,
                })}
              />
              <span className="primary-text-medium text-leadgaze-dark dark:text-zinc-200">
                {item.label}
              </span>
            </div>
            <Badge variant={item.value > 0 ? 'outline' : 'secondary'}>
              {item.value}
            </Badge>
          </Link>
        ))}
      </div>
    </CardWidgetContainer>
  );
}

function DepartmentDistributionPanel(props: { departments: DepartmentStat[] }) {
  const maxCount = Math.max(
    ...props.departments.map((department) => department.count),
    1,
  );

  return (
    <CardWidgetContainer
      title="Department Distribution"
      description="Active employees by department."
      icon2={<Building2 className="text-leadgaze-muted h-5 w-5" />}
      contentClassName="space-y-4 p-4"
    >
      {props.departments.length === 0 ? (
        <EmptyWidgetText>No department data available.</EmptyWidgetText>
      ) : (
        props.departments.map((department, index) => (
          <div key={department.name} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="primary-text-medium text-leadgaze-dark dark:text-white">
                {department.name}
              </span>
              <span className="primary-text-regular text-leadgaze-muted dark:text-white">
                {department.count}
              </span>
            </div>
            <div className="bar-bg h-2 w-full overflow-hidden rounded-full">
              <div
                className="h-full transition-all duration-500"
                style={{
                  backgroundColor: `var(--color-activity-${(index % 5) + 1})`,
                  width: `${(department.count / maxCount) * 100}%`,
                }}
              />
            </div>
          </div>
        ))
      )}
    </CardWidgetContainer>
  );
}

function RecentJoinersPanel(props: { items: RecentJoiner[] }) {
  return (
    <CardWidgetContainer
      title="Recent Joiners"
      description="Latest employees added to this workspace."
      icon2={<UserPlus className="text-leadgaze-muted h-5 w-5" />}
      contentClassName="p-0"
    >
      {props.items.length === 0 ? (
        <div className="p-4">
          <EmptyWidgetText>No recent joiners yet.</EmptyWidgetText>
        </div>
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
              <Badge variant="outline">{item.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </CardWidgetContainer>
  );
}

function ModuleSignalGrid(props: { signals: DashboardModuleSignal[] }) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:mt-4 xl:grid-cols-3 xl:gap-3 2xl:mt-8 2xl:gap-4">
      {props.signals.map((signal) => (
        <Link
          key={signal.label}
          href={signal.href}
          className="rounded-xl border border-slate-100 bg-white p-4 transition-colors hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="secondary-text-small text-leadgaze-muted dark:text-white">
                {signal.label}
              </p>
              <p className="primary-heading-number text-leadgaze-dark mt-1 dark:text-zinc-100">
                {signal.value}
              </p>
            </div>
            <span
              className={cn('h-2.5 w-2.5 rounded-full', {
                'bg-activity-4': signal.status === 'warning',
                'bg-activity-5': signal.status === 'good',
                'bg-primary': signal.status === 'neutral',
              })}
            />
          </div>
          <p className="secondary-text-small text-leadgaze-success mt-3">
            {signal.hint}
          </p>
        </Link>
      ))}
    </div>
  );
}

function ModuleDirectory(props: { workspaceName?: string | null }) {
  return (
    <CardWidgetContainer
      title="HRMS Modules"
      description={`Open the operational areas connected to ${props.workspaceName ?? 'this workspace'}.`}
      contentClassName="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3"
      className="mt-8 xl:mt-4 2xl:mt-8"
    >
      {modules.map((module) => {
        const Icon = module.icon;

        return (
          <Link
            key={module.href}
            href={module.href}
            className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="primary-text-medium text-leadgaze-dark dark:text-zinc-200">
                  {module.title}
                </p>
                <p className="secondary-text-small text-leadgaze-muted mt-1 dark:text-white">
                  {module.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </CardWidgetContainer>
  );
}

function EmptyWidgetText(props: { children: string }) {
  return (
    <div className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
      {props.children}
    </div>
  );
}

function HrmsDashboardSkeleton() {
  return (
    <div className="animate-in fade-in flex h-full flex-col overflow-y-auto p-0 pb-4 duration-500">
      <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-13 rounded-xl" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    </div>
  );
}

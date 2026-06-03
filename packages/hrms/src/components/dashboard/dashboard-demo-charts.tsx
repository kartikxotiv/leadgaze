'use client';

import {
  AlarmClockCheck,
  Briefcase,
  CalendarDays,
  CircleAlert,
  FileText,
  IndianRupee,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import { Skeleton } from '@kit/ui/skeleton';

import {
  AttendanceTrendChart,
  DepartmentDistributionChart,
  HrmsStatCard,
  PendingActionsPanel,
  QuickActionsPanel,
  RecentJoinersPanel,
} from './hrms-dashboard-component';
import { useHomeDashboard } from './use-home-dashboard';

export default function DashboardDemo() {
  const { data, isLoading } = useHomeDashboard();

  if (isLoading) {
    return (
      <div className={'animate-in fade-in space-y-4 pb-6 duration-500'}>
        <section
          className={'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'}
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </section>
        <section className={'grid grid-cols-1 gap-4 xl:grid-cols-3'}>
          <Skeleton className="h-[350px] rounded-xl xl:col-span-2" />
          <Skeleton className="h-[350px] rounded-xl" />
        </section>
        <section className={'grid grid-cols-1 gap-4 xl:grid-cols-3'}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[350px] rounded-xl" />
          ))}
        </section>
      </div>
    );
  }

  const statCards = [
    {
      title: 'TOTAL EMPLOYEES',
      value: String(data?.counts.totalEmployees ?? 0),
      subtitle: 'Active members',
      trend: 'neutral' as const,
      icon: <Users className={'text-primary h-5 w-5'} />,
    },
    {
      title: 'PRESENT TODAY',
      value: String(data?.counts.presentToday ?? 0),
      subtitle: `${data?.counts.totalEmployees ? ((data.counts.presentToday / data.counts.totalEmployees) * 100).toFixed(1) : 0}% attendance`,
      trend: 'up' as const,
      icon: <AlarmClockCheck className={'h-5 w-5 text-emerald-500'} />,
    },
    {
      title: 'ON LEAVE',
      value: String(data?.counts.onLeaveToday ?? 0),
      subtitle: 'Approved today',
      trend: 'down' as const,
      icon: <CalendarDays className={'h-5 w-5 text-amber-500'} />,
    },
    {
      title: 'PENDING PAYROLL',
      value: '₹ 0',
      subtitle: 'Current cycle',
      trend: 'neutral' as const,
      icon: <IndianRupee className={'h-5 w-5 text-violet-500'} />,
    },
  ];

  const pendingActions = [
    {
      label: 'Leave requests pending',
      count: data?.counts.pendingActions.leaveRequests ?? 0,
      highlight: (data?.counts.pendingActions.leaveRequests ?? 0) > 0,
    },
    { label: 'Attendance regularizations', count: 0 },
    { label: 'Document expiring soon', count: 0 },
    { label: 'Onboarding tasks due', count: 0 },
  ];

  const quickActions = [
    {
      label: 'Add Employee',
      icon: UserPlus,
      href: '/home/employes',
      color: 'text-blue-500',
    },
    {
      label: 'Approve Leave',
      icon: ShieldCheck,
      href: '/home/leave',
      color: 'text-emerald-500',
    },
    {
      label: 'Payroll Setup',
      icon: Briefcase,
      href: '/home/payroll',
      color: 'text-violet-500',
    },
    {
      label: 'Reports',
      icon: FileText,
      href: '/home/reports',
      color: 'text-amber-500',
    },
  ];

  return (
    <div className={'animate-in fade-in space-y-4 pb-6 duration-500'}>
      <section
        className={'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'}
      >
        {statCards.map((item) => (
          <HrmsStatCard
            key={item.title}
            title={item.title}
            value={item.value}
            subtitle={item.subtitle}
            trend={item.trend}
            icon={item.icon}
          />
        ))}
      </section>

      <section className={'grid grid-cols-1 gap-4 xl:grid-cols-3'}>
        <AttendanceTrendChart
          title={'Attendance Trends'}
          icon={<AlarmClockCheck className={'text-primary h-5 w-5'} />}
          data={data?.attendanceTrend ?? []}
        />

        <QuickActionsPanel title={'Quick Actions'} items={quickActions} />
      </section>

      <section className={'grid grid-cols-1 gap-4 xl:grid-cols-3'}>
        <DepartmentDistributionChart
          title={'Department Distribution'}
          icon={<Briefcase className={'h-5 w-5 text-violet-500'} />}
          data={data?.departmentStats ?? []}
        />

        <PendingActionsPanel
          title={'Pending Actions'}
          icon={<CircleAlert className={'h-5 w-5 text-amber-500'} />}
          items={pendingActions}
          ctaLabel={'View all actions'}
        />

        <RecentJoinersPanel
          title={'Recent Joiners'}
          icon={<UserPlus className={'text-primary h-5 w-5'} />}
          items={data?.recentJoiners ?? []}
        />
      </section>
    </div>
  );
}

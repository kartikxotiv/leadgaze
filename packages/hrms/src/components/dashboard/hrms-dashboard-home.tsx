import Link from 'next/link';

import {
  Building2,
  CalendarCheck,
  ClipboardList,
  FileBarChart,
  FileText,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  UserSearch,
  Users,
  WalletCards,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

const modules = [
  {
    title: 'Employees',
    description: 'Profiles, reporting lines, and employment status.',
    href: '/home/hrms/employees',
    icon: Users,
  },
  {
    title: 'Departments',
    description: 'Teams aligned to the active Leadgaze workspace.',
    href: '/home/hrms/departments',
    icon: Building2,
  },
  {
    title: 'Documents',
    description: 'Employee files, certificates, and HR records.',
    href: '/home/hrms/documents',
    icon: FileText,
  },
  {
    title: 'Attendance',
    description: 'Check-ins, shifts, and daily attendance records.',
    href: '/home/hrms/attendance',
    icon: CalendarCheck,
  },
  {
    title: 'Leave',
    description: 'Requests, approvals, balances, and holidays.',
    href: '/home/hrms/leave',
    icon: ClipboardList,
  },
  {
    title: 'Recruitment',
    description:
      'Requisitions, candidates, interviews, offers, and onboarding.',
    href: '/home/hrms/recruitment',
    icon: UserSearch,
  },
  {
    title: 'Separation',
    description: 'Resignations, exit clearances, settlements, and letters.',
    href: '/home/hrms/separation',
    icon: LogOut,
  },
  {
    title: 'Support System',
    description: 'Employee HR requests, ticket responses, and follow-up.',
    href: '/home/hrms/support-system',
    icon: LifeBuoy,
  },
  {
    title: 'Self Service',
    description: 'Profile updates, HR requests, announcements, and payslips.',
    href: '/home/hrms/self-service',
    icon: ShieldCheck,
  },
  {
    title: 'Payroll',
    description: 'Salary structures, runs, payslips, and approvals.',
    href: '/home/hrms/payroll',
    icon: WalletCards,
  },
  {
    title: 'Reports',
    description: 'Attendance, leave, payroll, and workforce analytics.',
    href: '/home/hrms/reports',
    icon: FileBarChart,
  },
];

export function HrmsDashboardHome(props: { workspaceName?: string | null }) {
  return (
    <div className="space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardDescription>
            {props.workspaceName ?? 'Current workspace'}
          </CardDescription>
          <CardTitle className="text-2xl">HRMS inside Leadgaze</CardTitle>
          <p className="text-muted-foreground max-w-3xl text-sm leading-6">
            HRMS is mounted as a Leadgaze module and uses the same session,
            account, workspace, role, and permission infrastructure.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Metric label="Identity" value="Leadgaze auth" />
          <Metric label="Tenant" value="Workspace" />
          <Metric label="Schema" value="hrms" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Card key={module.href} className="border-border/70">
              <CardHeader className="space-y-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {module.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href={module.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs uppercase">{props.label}</p>
      <p className="mt-2 text-sm font-semibold">{props.value}</p>
    </div>
  );
}

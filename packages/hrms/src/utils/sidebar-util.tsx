'use client';

import type React from 'react';

import {
  Activity,
  Building2,
  CalendarCheck,
  ClipboardList,
  Users,
  WalletCards,
} from 'lucide-react';

const hrmsRoutes = {
  label: '',
  children: [
    {
      label: 'HRMS Dashboard',
      path: '/home/hrms',
      Icon: <Activity className="h-4 w-4" />,
      end: true,
    },
    {
      label: 'Employees',
      path: '/home/hrms/employees',
      Icon: <Users className="h-4 w-4" />,
    },
    {
      label: 'Departments',
      path: '/home/hrms/departments',
      Icon: <Building2 className="h-4 w-4" />,
    },
    {
      label: 'Attendance',
      path: '/home/hrms/attendance',
      Icon: <CalendarCheck className="h-4 w-4" />,
    },
    {
      label: 'Leave',
      path: '/home/hrms/leave',
      Icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      label: 'Payroll',
      path: '/home/hrms/payroll',
      Icon: <WalletCards className="h-4 w-4" />,
    },
  ],
};

export default hrmsRoutes;

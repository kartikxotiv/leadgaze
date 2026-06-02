export type DashboardCounts = {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingActions: {
    leaveRequests: number;
  };
};

export type RecentJoiner = {
  name: string;
  initials: string;
  meta: string;
  status: 'Active' | 'Probation';
};

export type AttendanceTrendItem = {
  date: string;
  present: number;
  total: number;
};

export type DepartmentStat = {
  name: string;
  count: number;
  fill?: string;
};

export type HomeDashboardData = {
  counts: DashboardCounts;
  recentJoiners: RecentJoiner[];
  attendanceTrend: AttendanceTrendItem[];
  departmentStats: DepartmentStat[];
};

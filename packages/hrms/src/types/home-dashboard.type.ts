export type DashboardCounts = {
  activeEmployees: number;
  activeSeparation: number;
  openRecruitment: number;
  openSupportRequests: number;
  pendingPayrollRuns: number;
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingActions: {
    leaveRequests: number;
    payrollRuns: number;
    recruitmentItems: number;
    separationItems: number;
    supportRequests: number;
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
  label: string;
  present: number;
  total: number;
};

export type DepartmentStat = {
  name: string;
  count: number;
  fill?: string;
};

export type DashboardModuleSignal = {
  href: string;
  label: string;
  value: number | string;
  hint: string;
  status: 'good' | 'neutral' | 'warning';
};

export type DashboardPayrollSummary = {
  latestRunName: string | null;
  pendingRuns: number;
  publishedPayslips: number;
};

export type DashboardRecruitmentSummary = {
  activeCandidates: number;
  openRequisitions: number;
};

export type DashboardSupportSummary = {
  openRequests: number;
  urgentRequests: number;
};

export type HomeDashboardData = {
  counts: DashboardCounts;
  recentJoiners: RecentJoiner[];
  attendanceTrend: AttendanceTrendItem[];
  departmentStats: DepartmentStat[];
  moduleSignals: DashboardModuleSignal[];
  payroll: DashboardPayrollSummary;
  recruitment: DashboardRecruitmentSummary;
  support: DashboardSupportSummary;
};

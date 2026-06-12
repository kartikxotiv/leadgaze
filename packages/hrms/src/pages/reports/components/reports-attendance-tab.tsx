import type { ReportsDashboardResponse } from '../../../types/reports.type';
import { ReportTableCard, ReportsMetricGrid } from '../page.components';
import {
  formatMonthLabel,
  formatNumber,
  formatPercent,
} from './report-formatters';

export function ReportsAttendanceTab(props: {
  data: ReportsDashboardResponse['attendance'];
}) {
  const { data } = props;

  return (
    <>
      <ReportsMetricGrid items={data.metrics} />

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportTableCard
          title="Daily Attendance Summary"
          description="Day-wise attendance view for the selected employee scope."
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'total', label: 'Employees', align: 'right' },
            { key: 'present', label: 'Present', align: 'right' },
            { key: 'progress', label: 'In Progress', align: 'right' },
            { key: 'absent', label: 'Absent', align: 'right' },
            { key: 'hours', label: 'Avg Hours', align: 'right' },
            { key: 'rate', label: 'Attendance Rate', align: 'right' },
          ]}
          rows={data.dailySummary.map((row) => ({
            date: row.date,
            total: row.total_employees,
            present: row.present,
            progress: row.in_progress,
            absent: row.absent,
            hours: formatNumber(row.avg_work_hours),
            rate: formatPercent(row.attendance_rate),
          }))}
        />

        <ReportTableCard
          title="Monthly Attendance Summary"
          description="Month-wise roll-up across the selected date range."
          columns={[
            { key: 'month', label: 'Month' },
            { key: 'days', label: 'Days', align: 'right' },
            { key: 'present', label: 'Present Days', align: 'right' },
            { key: 'progress', label: 'In Progress Days', align: 'right' },
            { key: 'absent', label: 'Absent Days', align: 'right' },
            { key: 'hours', label: 'Avg Hours', align: 'right' },
            { key: 'rate', label: 'Attendance Rate', align: 'right' },
          ]}
          rows={data.monthlySummary.map((row) => ({
            month: formatMonthLabel(row.month),
            days: row.total_days,
            present: row.present_days,
            progress: row.in_progress_days,
            absent: row.absent_days,
            hours: formatNumber(row.avg_work_hours),
            rate: formatPercent(row.attendance_rate),
          }))}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportTableCard
          title="Late Coming / Early Going"
          description="Employees with the highest shift start and shift end deviations."
          columns={[
            { key: 'employee', label: 'Employee' },
            { key: 'department', label: 'Department' },
            { key: 'shift', label: 'Shift' },
            { key: 'lateCount', label: 'Late Count', align: 'right' },
            { key: 'lateMinutes', label: 'Late Minutes', align: 'right' },
            { key: 'earlyCount', label: 'Early Count', align: 'right' },
            { key: 'earlyMinutes', label: 'Early Minutes', align: 'right' },
          ]}
          rows={data.lateEarly.map((row) => ({
            employee: `${row.employee_name} (${row.employee_code})`,
            department: row.department_name,
            shift: row.shift_name,
            lateCount: row.late_count,
            lateMinutes: formatNumber(row.late_minutes),
            earlyCount: row.early_count,
            earlyMinutes: formatNumber(row.early_minutes),
          }))}
        />

        <ReportTableCard
          title="Overtime Report"
          description="Overtime hours computed from work hours above the scheduled shift duration."
          columns={[
            { key: 'employee', label: 'Employee' },
            { key: 'department', label: 'Department' },
            { key: 'shift', label: 'Shift' },
            { key: 'days', label: 'Overtime Days', align: 'right' },
            { key: 'hours', label: 'Overtime Hours', align: 'right' },
          ]}
          rows={data.overtime.map((row) => ({
            employee: `${row.employee_name} (${row.employee_code})`,
            department: row.department_name,
            shift: row.shift_name,
            days: row.overtime_days,
            hours: formatNumber(row.overtime_hours),
          }))}
        />
      </div>

      <ReportTableCard
        title="Shift-wise Attendance"
        description="Attendance distribution by assigned shift."
        columns={[
          { key: 'shift', label: 'Shift' },
          { key: 'present', label: 'Present', align: 'right' },
          { key: 'progress', label: 'In Progress', align: 'right' },
          { key: 'absent', label: 'Absent', align: 'right' },
          { key: 'hours', label: 'Avg Hours', align: 'right' },
          { key: 'overtime', label: 'Overtime Hours', align: 'right' },
          { key: 'rate', label: 'Attendance Rate', align: 'right' },
        ]}
        rows={data.shiftWise.map((row) => ({
          shift: row.shift_name,
          present: row.present,
          progress: row.in_progress,
          absent: row.absent,
          hours: formatNumber(row.avg_work_hours),
          overtime: formatNumber(row.overtime_hours),
          rate: formatPercent(row.attendance_rate),
        }))}
      />
    </>
  );
}

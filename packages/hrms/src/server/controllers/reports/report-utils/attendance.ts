import type { AttendanceReportsData } from '../../../../types/reports.type';
import {
  computeLateEarlyMetrics,
  createEmployeeSnapshot,
  getDateKeys,
  getDepartmentName,
  getEmployeeName,
  getMonthKey,
  getRecordStatus,
  getShiftName,
  roundNumber,
  toReportMetric,
} from './shared';
import type { AttendanceRecordRow, ReportsEmployeeRow } from './types';

export function buildAttendanceReports(params: {
  employees: ReportsEmployeeRow[];
  records: AttendanceRecordRow[];
  to: string;
  from: string;
}) {
  const totalEmployees = params.employees.length;
  const dateKeys = getDateKeys(params.from, params.to);
  const recordMap = new Map(
    params.records.map((record) => [
      `${record.employee_id}:${record.date}`,
      record,
    ]),
  );
  const dailyMap = new Map(
    dateKeys.map((date) => [
      date,
      {
        date,
        present: 0,
        in_progress: 0,
        total_hours: 0,
      },
    ]),
  );
  const lateEarlyMap = new Map<
    string,
    {
      department_name: string;
      early_count: number;
      early_minutes: number;
      employee_code: string;
      employee_id: string;
      employee_name: string;
      late_count: number;
      late_minutes: number;
      shift_name: string;
    }
  >();
  const overtimeMap = new Map<
    string,
    {
      department_name: string;
      employee_code: string;
      employee_id: string;
      employee_name: string;
      overtime_days: number;
      overtime_hours: number;
      shift_name: string;
    }
  >();
  const shiftWiseMap = new Map<
    string,
    {
      absent: number;
      avg_work_hours_total: number;
      in_progress: number;
      overtime_hours: number;
      present: number;
      shift_id: string | null;
      shift_name: string;
      worked_rows: number;
    }
  >();
  const employeeSnapshot = new Map(
    params.employees.map((employee) => [employee.id, createEmployeeSnapshot()]),
  );

  for (const employee of params.employees) {
    for (const date of dateKeys) {
      const record = recordMap.get(`${employee.id}:${date}`);
      const effectiveShift = record?.shift ?? employee.shift ?? null;
      const shiftKey = effectiveShift?.id ?? 'unassigned';
      const shiftEntry = shiftWiseMap.get(shiftKey) ?? {
        shift_id: effectiveShift?.id ?? null,
        shift_name: getShiftName(effectiveShift),
        present: 0,
        absent: 0,
        in_progress: 0,
        overtime_hours: 0,
        avg_work_hours_total: 0,
        worked_rows: 0,
      };
      const status = getRecordStatus(record, employee);

      if (status === 'present') {
        shiftEntry.present += 1;
      } else if (status === 'in_progress') {
        shiftEntry.in_progress += 1;
      } else {
        shiftEntry.absent += 1;
      }

      if (record?.work_hours) {
        shiftEntry.avg_work_hours_total += Number(record.work_hours);
        shiftEntry.worked_rows += 1;
      }

      shiftWiseMap.set(shiftKey, shiftEntry);

      if (!record) {
        continue;
      }

      const dailyEntry = dailyMap.get(record.date);
      if (!dailyEntry) {
        continue;
      }

      if (status === 'present') {
        dailyEntry.present += 1;
      } else if (status === 'in_progress') {
        dailyEntry.in_progress += 1;
      }

      dailyEntry.total_hours += Number(record.work_hours ?? 0);

      const lateEarly = computeLateEarlyMetrics({
        date: record.date,
        checkIn: record.check_in,
        checkOut: record.check_out,
        shift: effectiveShift,
      });

      const employeeLateEarly = lateEarlyMap.get(employee.id) ?? {
        employee_id: employee.id,
        employee_name: getEmployeeName(employee),
        employee_code: employee.employee_code,
        department_name: getDepartmentName(employee),
        shift_name: getShiftName(effectiveShift),
        late_count: 0,
        late_minutes: 0,
        early_count: 0,
        early_minutes: 0,
      };

      if (lateEarly.lateMinutes > 0) {
        employeeLateEarly.late_count += 1;
        employeeLateEarly.late_minutes += lateEarly.lateMinutes;
        const snapshot = employeeSnapshot.get(employee.id);
        if (snapshot) {
          snapshot.lateCount += 1;
        }
      }

      if (lateEarly.earlyMinutes > 0) {
        employeeLateEarly.early_count += 1;
        employeeLateEarly.early_minutes += lateEarly.earlyMinutes;
      }

      lateEarlyMap.set(employee.id, employeeLateEarly);

      const overtimeHours = Math.max(
        Number(record.work_hours ?? 0) - lateEarly.scheduledHours,
        0,
      );

      if (overtimeHours > 0) {
        const employeeOvertime = overtimeMap.get(employee.id) ?? {
          employee_id: employee.id,
          employee_name: getEmployeeName(employee),
          employee_code: employee.employee_code,
          department_name: getDepartmentName(employee),
          shift_name: getShiftName(effectiveShift),
          overtime_days: 0,
          overtime_hours: 0,
        };
        employeeOvertime.overtime_days += 1;
        employeeOvertime.overtime_hours += overtimeHours;
        overtimeMap.set(employee.id, employeeOvertime);

        const shiftEntryWithOvertime = shiftWiseMap.get(shiftKey);
        if (shiftEntryWithOvertime) {
          shiftEntryWithOvertime.overtime_hours += overtimeHours;
          shiftWiseMap.set(shiftKey, shiftEntryWithOvertime);
        }

        const snapshot = employeeSnapshot.get(employee.id);
        if (snapshot) {
          snapshot.overtimeHours += overtimeHours;
        }
      }

      if (status === 'present') {
        const snapshot = employeeSnapshot.get(employee.id);
        if (snapshot) {
          snapshot.presentDays += 1;
        }
      }
    }
  }

  const dailySummary = Array.from(dailyMap.values()).map((row) => ({
    date: row.date,
    total_employees: totalEmployees,
    present: row.present,
    in_progress: row.in_progress,
    absent: Math.max(totalEmployees - row.present - row.in_progress, 0),
    avg_work_hours:
      row.present + row.in_progress > 0
        ? roundNumber(row.total_hours / (row.present + row.in_progress))
        : 0,
    attendance_rate:
      totalEmployees > 0
        ? roundNumber((row.present / totalEmployees) * 100)
        : 0,
  }));

  const monthlyAccumulator = new Map<
    string,
    {
      absent_days: number;
      in_progress_days: number;
      month: string;
      present_days: number;
      total_days: number;
      total_hours: number;
    }
  >();

  for (const row of dailySummary) {
    const monthKey = getMonthKey(row.date);
    const monthEntry = monthlyAccumulator.get(monthKey) ?? {
      month: monthKey,
      total_days: 0,
      present_days: 0,
      in_progress_days: 0,
      absent_days: 0,
      total_hours: 0,
    };

    monthEntry.total_days += 1;
    monthEntry.present_days += row.present;
    monthEntry.in_progress_days += row.in_progress;
    monthEntry.absent_days += row.absent;
    monthEntry.total_hours +=
      row.avg_work_hours * Math.max(row.present + row.in_progress, 1);

    monthlyAccumulator.set(monthKey, monthEntry);
  }

  const monthlySummary = Array.from(monthlyAccumulator.values())
    .map((row) => ({
      month: row.month,
      total_days: row.total_days,
      present_days: row.present_days,
      in_progress_days: row.in_progress_days,
      absent_days: row.absent_days,
      avg_work_hours:
        row.present_days + row.in_progress_days > 0
          ? roundNumber(
              row.total_hours / (row.present_days + row.in_progress_days),
            )
          : 0,
      attendance_rate:
        totalEmployees > 0 && row.total_days > 0
          ? roundNumber(
              (row.present_days / (totalEmployees * row.total_days)) * 100,
            )
          : 0,
    }))
    .sort((left, right) => left.month.localeCompare(right.month));

  const lateEarly = Array.from(lateEarlyMap.values())
    .sort(
      (left, right) =>
        right.late_minutes +
        right.early_minutes -
        (left.late_minutes + left.early_minutes),
    )
    .map((row) => ({
      ...row,
      late_minutes: roundNumber(row.late_minutes),
      early_minutes: roundNumber(row.early_minutes),
    }));

  const overtime = Array.from(overtimeMap.values())
    .sort((left, right) => right.overtime_hours - left.overtime_hours)
    .map((row) => ({
      ...row,
      overtime_hours: roundNumber(row.overtime_hours),
    }));

  const shiftWise = Array.from(shiftWiseMap.values())
    .map((row) => {
      const totalShiftRows = row.present + row.absent + row.in_progress;

      return {
        shift_id: row.shift_id,
        shift_name: row.shift_name,
        present: row.present,
        absent: row.absent,
        in_progress: row.in_progress,
        overtime_hours: roundNumber(row.overtime_hours),
        avg_work_hours:
          row.worked_rows > 0
            ? roundNumber(row.avg_work_hours_total / row.worked_rows)
            : 0,
        attendance_rate:
          totalShiftRows > 0
            ? roundNumber((row.present / totalShiftRows) * 100)
            : 0,
      };
    })
    .sort((left, right) => left.shift_name.localeCompare(right.shift_name));

  const presentDays = dailySummary.reduce((sum, row) => sum + row.present, 0);
  const absentDays = dailySummary.reduce((sum, row) => sum + row.absent, 0);
  const lateInstances = lateEarly.reduce((sum, row) => sum + row.late_count, 0);
  const totalOvertimeHours = overtime.reduce(
    (sum, row) => sum + row.overtime_hours,
    0,
  );

  return {
    data: {
      metrics: [
        toReportMetric(
          'Employees in scope',
          totalEmployees,
          'Employees included after role-based scope and selected filters.',
        ),
        toReportMetric(
          'Present employee-days',
          presentDays,
          'Attendance records marked present across the selected range.',
        ),
        toReportMetric(
          'Late instances',
          lateInstances,
          'Late arrivals after shift grace time.',
        ),
        toReportMetric(
          'Overtime hours',
          roundNumber(totalOvertimeHours),
          'Extra work hours above scheduled shift duration.',
        ),
        toReportMetric(
          'Absent employee-days',
          absentDays,
          'Missing or absent attendance entries across the selected range.',
        ),
      ],
      dailySummary,
      monthlySummary,
      lateEarly,
      overtime,
      shiftWise,
    } satisfies AttendanceReportsData,
    employeeSnapshot,
  };
}

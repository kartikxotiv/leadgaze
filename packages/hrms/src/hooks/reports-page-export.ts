import type { ReportsTabValue } from '../pages/reports/page.data';
import type { ReportsDashboardResponse } from '../types/reports.type';

type ExportSection = {
  columns: string[];
  rows: Array<Record<string, string | number>>;
  title: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildHtmlDocument(params: {
  filters: ReportsDashboardResponse['filters'];
  sections: ExportSection[];
  title: string;
}) {
  const filtersHtml = `
    <div class="meta-grid">
      <div><strong>From</strong><span>${escapeHtml(params.filters.from)}</span></div>
      <div><strong>To</strong><span>${escapeHtml(params.filters.to)}</span></div>
      <div><strong>Employees</strong><span>${params.filters.appliedEmployeeCount}</span></div>
      <div><strong>Accessible Employees</strong><span>${params.filters.totalAccessibleEmployees}</span></div>
    </div>
  `;

  const sectionsHtml = params.sections
    .map((section) => {
      const head = section.columns
        .map((column) => `<th>${escapeHtml(column)}</th>`)
        .join('');
      const body = section.rows
        .map((row) => {
          const cells = section.columns
            .map(
              (column) => `<td>${escapeHtml(String(row[column] ?? '-'))}</td>`,
            )
            .join('');

          return `<tr>${cells}</tr>`;
        })
        .join('');

      return `
        <section class="section">
          <h2>${escapeHtml(section.title)}</h2>
          <table>
            <thead><tr>${head}</tr></thead>
            <tbody>${body || `<tr><td colspan="${section.columns.length}">No rows available</td></tr>`}</tbody>
          </table>
        </section>
      `;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(params.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          h2 { margin: 0 0 12px; font-size: 16px; }
          p { margin: 0 0 16px; color: #4b5563; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
          .meta-grid div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; display: grid; gap: 4px; }
          .section { margin-top: 28px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 600; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(params.title)}</h1>
        <p>Generated from the HRMS reports module.</p>
        ${filtersHtml}
        ${sectionsHtml}
      </body>
    </html>
  `;
}

function downloadBlob(params: { blob: Blob; filename: string }) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(params.blob);

  link.href = url;
  link.download = params.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildExportSections(
  activeTab: ReportsTabValue,
  data: ReportsDashboardResponse,
) {
  const summarySection = {
    title: 'Summary Metrics',
    columns: ['Metric', 'Value', 'Hint'],
    rows: (activeTab === 'attendance'
      ? data.attendance.metrics
      : activeTab === 'leave'
        ? data.leave.metrics
        : activeTab === 'payroll'
          ? data.payroll.metrics
          : data.custom.metrics
    ).map((metric) => ({
      Metric: metric.label,
      Value: metric.value,
      Hint: metric.hint,
    })),
  } satisfies ExportSection;

  if (activeTab === 'attendance') {
    return [
      summarySection,
      {
        title: 'Daily Attendance Summary',
        columns: [
          'Date',
          'Total Employees',
          'Present',
          'In Progress',
          'Absent',
          'Avg Work Hours',
          'Attendance Rate',
        ],
        rows: data.attendance.dailySummary.map((row) => ({
          Date: row.date,
          'Total Employees': row.total_employees,
          Present: row.present,
          'In Progress': row.in_progress,
          Absent: row.absent,
          'Avg Work Hours': row.avg_work_hours,
          'Attendance Rate': row.attendance_rate,
        })),
      },
      {
        title: 'Monthly Attendance Summary',
        columns: [
          'Month',
          'Total Days',
          'Present Days',
          'In Progress Days',
          'Absent Days',
          'Avg Work Hours',
          'Attendance Rate',
        ],
        rows: data.attendance.monthlySummary.map((row) => ({
          Month: row.month,
          'Total Days': row.total_days,
          'Present Days': row.present_days,
          'In Progress Days': row.in_progress_days,
          'Absent Days': row.absent_days,
          'Avg Work Hours': row.avg_work_hours,
          'Attendance Rate': row.attendance_rate,
        })),
      },
      {
        title: 'Late Coming / Early Going',
        columns: [
          'Employee',
          'Department',
          'Shift',
          'Late Count',
          'Late Minutes',
          'Early Count',
          'Early Minutes',
        ],
        rows: data.attendance.lateEarly.map((row) => ({
          Employee: `${row.employee_name} (${row.employee_code})`,
          Department: row.department_name,
          Shift: row.shift_name,
          'Late Count': row.late_count,
          'Late Minutes': row.late_minutes,
          'Early Count': row.early_count,
          'Early Minutes': row.early_minutes,
        })),
      },
      {
        title: 'Overtime',
        columns: [
          'Employee',
          'Department',
          'Shift',
          'Overtime Days',
          'Overtime Hours',
        ],
        rows: data.attendance.overtime.map((row) => ({
          Employee: `${row.employee_name} (${row.employee_code})`,
          Department: row.department_name,
          Shift: row.shift_name,
          'Overtime Days': row.overtime_days,
          'Overtime Hours': row.overtime_hours,
        })),
      },
      {
        title: 'Shift-wise Attendance',
        columns: [
          'Shift',
          'Present',
          'In Progress',
          'Absent',
          'Avg Work Hours',
          'Overtime Hours',
          'Attendance Rate',
        ],
        rows: data.attendance.shiftWise.map((row) => ({
          Shift: row.shift_name,
          Present: row.present,
          'In Progress': row.in_progress,
          Absent: row.absent,
          'Avg Work Hours': row.avg_work_hours,
          'Overtime Hours': row.overtime_hours,
          'Attendance Rate': row.attendance_rate,
        })),
      },
    ];
  }

  if (activeTab === 'leave') {
    return [
      summarySection,
      {
        title: 'Leave Balance',
        columns: [
          'Employee',
          'Department',
          'Allocated',
          'Approved',
          'Pending',
          'Available',
        ],
        rows: data.leave.balance.map((row) => ({
          Employee: `${row.employee_name} (${row.employee_code})`,
          Department: row.department_name,
          Allocated: row.allocated,
          Approved: row.approved,
          Pending: row.pending,
          Available: row.available,
        })),
      },
      {
        title: 'Leave Utilization',
        columns: [
          'Leave Type',
          'Approved Days',
          'Pending Days',
          'Rejected Days',
          'Requests',
        ],
        rows: data.leave.utilization.map((row) => ({
          'Leave Type': row.leave_type_name,
          'Approved Days': row.approved_days,
          'Pending Days': row.pending_days,
          'Rejected Days': row.rejected_days,
          Requests: row.total_requests,
        })),
      },
      {
        title: 'Leave Trend',
        columns: [
          'Month',
          'Approved Days',
          'Pending Days',
          'Rejected Days',
          'Requests',
        ],
        rows: data.leave.trend.map((row) => ({
          Month: row.month,
          'Approved Days': row.approved_days,
          'Pending Days': row.pending_days,
          'Rejected Days': row.rejected_days,
          Requests: row.total_requests,
        })),
      },
      {
        title: 'Department-wise Leave',
        columns: [
          'Department',
          'Approved Days',
          'Pending Requests',
          'Rejected Requests',
          'Total Requests',
        ],
        rows: data.leave.departmentWise.map((row) => ({
          Department: row.department_name,
          'Approved Days': row.approved_days,
          'Pending Requests': row.pending_requests,
          'Rejected Requests': row.rejected_requests,
          'Total Requests': row.total_requests,
        })),
      },
    ];
  }

  if (activeTab === 'payroll') {
    return [
      summarySection,
      {
        title: 'Payroll Summary',
        columns: [
          'Period',
          'Employees',
          'Gross Earnings',
          'Deductions',
          'Employer Contributions',
          'Net Pay',
          'Status',
        ],
        rows: data.payroll.payrollSummary.map((row) => ({
          Period: row.period,
          Employees: row.employee_count,
          'Gross Earnings': row.gross_earnings,
          Deductions: row.total_deductions,
          'Employer Contributions': row.employer_contributions,
          'Net Pay': row.net_pay,
          Status: row.status,
        })),
      },
      {
        title: 'Salary Component Breakdown',
        columns: ['Component', 'Code', 'Type', 'Amount', 'Employees'],
        rows: data.payroll.componentBreakdown.map((row) => ({
          Component: row.component_name,
          Code: row.component_code,
          Type: row.type,
          Amount: row.amount,
          Employees: row.employee_count,
        })),
      },
      {
        title: 'Department-wise Payroll Cost',
        columns: [
          'Department',
          'Employees',
          'Gross Earnings',
          'Deductions',
          'Employer Contributions',
          'Net Pay',
        ],
        rows: data.payroll.departmentCost.map((row) => ({
          Department: row.department_name,
          Employees: row.employee_count,
          'Gross Earnings': row.gross_earnings,
          Deductions: row.total_deductions,
          'Employer Contributions': row.employer_contributions,
          'Net Pay': row.net_pay,
        })),
      },
      {
        title: 'Overtime Payout',
        columns: [
          'Employee',
          'Department',
          'Period',
          'Component',
          'Source',
          'Amount',
        ],
        rows: data.payroll.overtimePayout.map((row) => ({
          Employee: `${row.employee_name} (${row.employee_code})`,
          Department: row.department_name,
          Period: row.period,
          Component: row.component_name,
          Source: row.source,
          Amount: row.amount,
        })),
      },
      {
        title: 'Arrears & Bonus',
        columns: [
          'Employee',
          'Department',
          'Item',
          'Source Type',
          'Amount',
          'Effective Date',
          'Payable Period',
          'Status',
        ],
        rows: data.payroll.bonusAndArrears.map((row) => ({
          Employee: `${row.employee_name} (${row.employee_code})`,
          Department: row.department_name,
          Item: row.item_name,
          'Source Type': row.source_type,
          Amount: row.amount,
          'Effective Date': row.effective_date,
          'Payable Period': row.payable_period,
          Status: row.status,
        })),
      },
    ];
  }

  return [
    summarySection,
    {
      title: 'Custom Workforce Snapshot',
      columns: [
        'Employee',
        'Department',
        'Present Days',
        'Late Count',
        'Overtime Hours',
        'Leave Days',
        'Net Pay',
      ],
      rows: data.custom.workforceSnapshot.map((row) => ({
        Employee: `${row.employee_name} (${row.employee_code})`,
        Department: row.department_name,
        'Present Days': row.present_days,
        'Late Count': row.late_count,
        'Overtime Hours': row.overtime_hours,
        'Leave Days': row.leave_days,
        'Net Pay': row.net_pay,
      })),
    },
  ];
}

function buildExportTitle(activeTab: ReportsTabValue) {
  switch (activeTab) {
    case 'attendance':
      return 'Attendance Reports';
    case 'leave':
      return 'Leave Reports';
    case 'payroll':
      return 'Payroll Reports';
    default:
      return 'Custom Reports';
  }
}

function buildExportFilename(
  title: string,
  filters: ReportsDashboardResponse['filters'],
) {
  return `${title.toLowerCase().replace(/\s+/g, '-')}-${filters.from}-${filters.to}.xls`;
}

export function exportReportsExcel(params: {
  activeTab: ReportsTabValue;
  data: ReportsDashboardResponse;
}) {
  const title = buildExportTitle(params.activeTab);
  const html = buildHtmlDocument({
    title,
    filters: params.data.filters,
    sections: buildExportSections(params.activeTab, params.data),
  });
  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });

  downloadBlob({
    blob,
    filename: buildExportFilename(title, params.data.filters),
  });
}

export function exportReportsPdf(params: {
  activeTab: ReportsTabValue;
  data: ReportsDashboardResponse;
}) {
  const printWindow = window.open('about:blank', '_blank');

  if (!printWindow) {
    return false;
  }

  const printableHtml = buildHtmlDocument({
    title: buildExportTitle(params.activeTab),
    filters: params.data.filters,
    sections: buildExportSections(params.activeTab, params.data),
  });

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  printWindow.document.open();
  printWindow.document.write(printableHtml);
  printWindow.document.close();

  return true;
}

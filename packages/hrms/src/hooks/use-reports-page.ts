'use client';

import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { showToast } from '../components/global/ToastAlert';
import { useRbac } from '../components/rbac/rbac-context';
import type { ReportsTabValue } from '../pages/reports/page.data';
import { getReportsDashboardService } from '../server/services/reports.service';
import type {
  ApiSuccessResponse,
  ReportsDashboardResponse,
  ReportsEmployeeOption,
  ReportsFilterState,
} from '../types/reports.type';
import { exportReportsExcel, exportReportsPdf } from './reports-page-export';
import {
  filterEmployeeOptions,
  getDefaultFilters,
  hasInvalidDateRange,
  normalizeFilters,
} from './reports-page-filters';

export function useReportsPage() {
  const { hasPermission, isLoading: isRbacLoading } = useRbac();
  const [activeTab, setActiveTab] = useState<ReportsTabValue>('attendance');
  const [draftFilters, setDraftFilters] = useState<ReportsFilterState>(() =>
    getDefaultFilters(),
  );
  const [appliedFilters, setAppliedFilters] = useState<ReportsFilterState>(() =>
    getDefaultFilters(),
  );
  const canViewReports = hasPermission('reports', 'view', 'own');

  const dashboardQuery = useQuery({
    queryKey: ['reports-dashboard', appliedFilters],
    queryFn: () =>
      getReportsDashboardService(appliedFilters) as Promise<
        ApiSuccessResponse<ReportsDashboardResponse>
      >,
    enabled: canViewReports,
  });

  const dashboardData = (dashboardQuery.data?.data ??
    null) as ReportsDashboardResponse | null;
  const employeeOptions = useMemo(() => {
    const employees = (dashboardData?.options.employees ??
      []) as ReportsEmployeeOption[];

    return filterEmployeeOptions({
      employees,
      departmentId: draftFilters.departmentId,
      shiftId: draftFilters.shiftId,
    });
  }, [
    dashboardData?.options.employees,
    draftFilters.departmentId,
    draftFilters.shiftId,
  ]);

  const canExport = dashboardData?.permissions.canExport ?? false;

  return {
    activeTab,
    canExport,
    canViewReports,
    dashboardData,
    dashboardQuery,
    draftFilters,
    employeeOptions,
    isRbacLoading,
    setActiveTab,
    setDraftFilters,
    applyFilters: () => {
      if (hasInvalidDateRange(draftFilters)) {
        showToast(
          'The report start date must be before the end date.',
          'error',
        );
        return;
      }

      setAppliedFilters(normalizeFilters(draftFilters));
    },
    clearEmployees: () => {
      setDraftFilters((current) => ({
        ...current,
        employeeIds: [],
      }));
    },
    exportExcel: () => {
      if (!dashboardData) {
        showToast('No report data is available to export.', 'error');
        return;
      }

      exportReportsExcel({
        activeTab,
        data: dashboardData,
      });
      showToast('Excel export downloaded successfully.');
    },
    exportPdf: () => {
      if (!dashboardData) {
        showToast('No report data is available to export.', 'error');
        return;
      }

      const didOpenPrintWindow = exportReportsPdf({
        activeTab,
        data: dashboardData,
      });

      if (!didOpenPrintWindow) {
        showToast('Allow popups in the browser to export PDF.', 'error');
        return;
      }

      showToast('Print dialog opened for PDF export.');
    },
    resetFilters: () => {
      const nextFilters = getDefaultFilters();
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
    },
    selectAllVisibleEmployees: () => {
      setDraftFilters((current) => ({
        ...current,
        employeeIds: employeeOptions.map(
          (employee: ReportsEmployeeOption) => employee.id,
        ),
      }));
    },
    toggleEmployee: (employeeId: string) => {
      setDraftFilters((current) => {
        const selected = new Set(current.employeeIds ?? []);
        if (selected.has(employeeId)) {
          selected.delete(employeeId);
        } else {
          selected.add(employeeId);
        }

        return {
          ...current,
          employeeIds: Array.from(selected),
        };
      });
    },
  };
}

export type ReportsPageController = ReturnType<typeof useReportsPage>;

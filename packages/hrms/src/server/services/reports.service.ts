import type {
  ApiSuccessResponse,
  ReportsDashboardResponse,
  ReportsFilterState,
} from '~/types/reports.type';
import { asyncHandlerClient } from '~/utils/async-handler';

import ApiClient from '../utils/axios-client';

const getReportsDashboardService = asyncHandlerClient(
  async (filters: ReportsFilterState) => {
    const response =
      await ApiClient.get<ApiSuccessResponse<ReportsDashboardResponse>>(
        '/reports',
        {
          params: {
            from: filters.from,
            to: filters.to,
            departmentId: filters.departmentId || undefined,
            shiftId: filters.shiftId || undefined,
            employeeIds:
              filters.employeeIds && filters.employeeIds.length > 0
                ? filters.employeeIds.join(',')
                : undefined,
          },
        },
      );

    return response.data;
  },
);

export { getReportsDashboardService };

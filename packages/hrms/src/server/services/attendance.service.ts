import type {
  AdminAttendanceFilters,
  AdminAttendanceResponse,
  ApiSuccessResponse,
  AttendanceContext,
  AttendanceSettings,
  MyAttendanceResponse,
} from '~/types/attendance.type';
import { asyncHandlerClient } from '~/utils/async-handler';

import ApiClient from '../utils/axios-client';

const getAttendanceContextService = asyncHandlerClient(async () => {
  const response = await ApiClient.get<ApiSuccessResponse<AttendanceContext>>(
    '/attendance/context',
  );

  return response.data;
});

const getMyAttendanceService = asyncHandlerClient(async (date?: string) => {
  const response = await ApiClient.get<
    ApiSuccessResponse<MyAttendanceResponse>
  >('/attendance/me', {
    params: date ? { date } : undefined,
  });

  return response.data;
});

const getAdminAttendanceService = asyncHandlerClient(
  async (filters: AdminAttendanceFilters = {}) => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => Boolean(value)),
    );

    const response = await ApiClient.get<
      ApiSuccessResponse<AdminAttendanceResponse>
    >('/attendance', {
      params,
    });

    return response.data;
  },
);

const getAttendanceSettingsService = asyncHandlerClient(async () => {
  const response = await ApiClient.get<ApiSuccessResponse<AttendanceSettings>>(
    '/attendance/working-days',
  );

  return response.data;
});

const updateWorkingDaysService = asyncHandlerClient(
  async (workingDays: AttendanceSettings['working_days']) => {
    const response = await ApiClient.patch<
      ApiSuccessResponse<AttendanceSettings>
    >('/attendance/working-days', {
      working_days: workingDays,
    });

    return response.data;
  },
);

const checkInService = asyncHandlerClient(async () => {
  const response = await ApiClient.post<
    ApiSuccessResponse<{ check_in: string }>
  >('/attendance/check-in', {});

  return response.data;
});

const checkOutService = asyncHandlerClient(async () => {
  const response = await ApiClient.post<
    ApiSuccessResponse<{ check_out: string; work_hours: number | null }>
  >('/attendance/check-out', {});

  return response.data;
});

const updateAttendanceRecordService = asyncHandlerClient(
  async (
    recordId: string,
    data: {
      check_in?: string | null;
      check_out?: string | null;
      shift_id?: string | null;
      status?: 'present' | 'absent';
    },
  ) => {
    const response = await ApiClient.patch<ApiSuccessResponse<unknown>>(
      `/attendance/records/${recordId}`,
      data,
    );

    return response.data;
  },
);

const upsertAttendanceRecordService = asyncHandlerClient(
  async (data: {
    employee_id: string;
    date: string;
    check_in?: string | null;
    check_out?: string | null;
    shift_id?: string | null;
    status?: 'present' | 'absent';
  }) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      '/attendance/records',
      data,
    );

    return response.data;
  },
);

export {
  checkInService,
  checkOutService,
  getAdminAttendanceService,
  getAttendanceSettingsService,
  getAttendanceContextService,
  getMyAttendanceService,
  upsertAttendanceRecordService,
  updateAttendanceRecordService,
  updateWorkingDaysService,
};

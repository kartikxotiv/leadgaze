import { asyncHandlerClient } from '~/utils/async-handler';

import type {
  ApiSuccessResponse,
  LeaveDashboardResponse,
  LeaveHoliday,
  LeaveHolidayPayload,
  LeaveRequest,
  LeaveRequestActionPayload,
  LeaveRequestCreatePayload,
  LeaveType,
  LeaveTypePayload,
} from '~/types/leave.type';

import ApiClient from '../utils/axios-client';

const getLeaveDashboardService = asyncHandlerClient(async (year?: number) => {
  const response =
    await ApiClient.get<ApiSuccessResponse<LeaveDashboardResponse>>('/leave', {
      params: year ? { year } : undefined,
    });

  return response.data;
});

const createLeaveRequestService = asyncHandlerClient(
  async (data: LeaveRequestCreatePayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<LeaveRequest>>(
      '/leave',
      data,
    );

    return response.data;
  },
);

const updateLeaveRequestService = asyncHandlerClient(
  async (requestId: string, data: LeaveRequestActionPayload) => {
    const response = await ApiClient.patch<ApiSuccessResponse<LeaveRequest>>(
      `/leave/${requestId}`,
      data,
    );

    return response.data;
  },
);

const createLeaveTypeService = asyncHandlerClient(
  async (data: LeaveTypePayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<LeaveType>>(
      '/leave/types',
      data,
    );

    return response.data;
  },
);

const updateLeaveTypeService = asyncHandlerClient(
  async (typeId: string, data: Partial<LeaveTypePayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<LeaveType>>(
      `/leave/types/${typeId}`,
      data,
    );

    return response.data;
  },
);

const deleteLeaveTypeService = asyncHandlerClient(async (typeId: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<LeaveType>>(
    `/leave/types/${typeId}`,
  );

  return response.data;
});

const createLeaveHolidayService = asyncHandlerClient(
  async (data: LeaveHolidayPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<LeaveHoliday>>(
      '/leave/holidays',
      data,
    );

    return response.data;
  },
);

const updateLeaveHolidayService = asyncHandlerClient(
  async (holidayId: string, data: Partial<LeaveHolidayPayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<LeaveHoliday>>(
      `/leave/holidays/${holidayId}`,
      data,
    );

    return response.data;
  },
);

const deleteLeaveHolidayService = asyncHandlerClient(async (holidayId: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<null>>(
    `/leave/holidays/${holidayId}`,
  );

  return response.data;
});

export {
  createLeaveHolidayService,
  createLeaveRequestService,
  createLeaveTypeService,
  deleteLeaveHolidayService,
  deleteLeaveTypeService,
  getLeaveDashboardService,
  updateLeaveHolidayService,
  updateLeaveRequestService,
  updateLeaveTypeService,
};

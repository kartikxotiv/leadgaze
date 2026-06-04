import type {
  ApiSuccessResponse,
  Shift,
  ShiftFormPayload,
} from '../../types/shift.type';
import { asyncHandlerClient } from '../../utils/async-handler';
import ApiClient from '../../utils/axios-client';

const listShiftsService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<Array<Shift>>>('/shifts');
  return response.data;
});

const createShiftService = asyncHandlerClient(
  async (data: ShiftFormPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<Shift>>(
      '/shifts',
      data,
    );
    return response.data;
  },
);

const updateShiftService = asyncHandlerClient(
  async (shiftId: string, data: Partial<ShiftFormPayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<Shift>>(
      `/shifts/${shiftId}`,
      data,
    );
    return response.data;
  },
);

const deleteShiftService = asyncHandlerClient(async (shiftId: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<null>>(
    `/shifts/${shiftId}`,
  );
  return response.data;
});

export {
  createShiftService,
  deleteShiftService,
  listShiftsService,
  updateShiftService,
};

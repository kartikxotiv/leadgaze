import { asyncHandlerClient } from '../../utils/async-handler';
import type {
  ApiSuccessResponse,
  Department,
  DepartmentFormPayload,
  DepartmentOptions,
} from '../../types/department.type';
import ApiClient from '../../utils/axios-client';

const listDepartmentsService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<Array<Department>>>('/departments');

  return response.data;
});

const getDepartmentOptionsService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<DepartmentOptions>>(
      '/departments/options',
    );

  return response.data;
});

const createDepartmentService = asyncHandlerClient(
  async (data: DepartmentFormPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<Department>>(
      '/departments',
      data,
    );

    return response.data;
  },
);

const updateDepartmentService = asyncHandlerClient(
  async (departmentId: string, data: DepartmentFormPayload) => {
    const response = await ApiClient.patch<ApiSuccessResponse<Department>>(
      `/departments/${departmentId}`,
      data,
    );

    return response.data;
  },
);

const deleteDepartmentService = asyncHandlerClient(
  async (departmentId: string) => {
    const response = await ApiClient.delete<ApiSuccessResponse<null>>(
      `/departments/${departmentId}`,
    );

    return response.data;
  },
);

export {
  createDepartmentService,
  deleteDepartmentService,
  getDepartmentOptionsService,
  listDepartmentsService,
  updateDepartmentService,
};

import type {
  ApiSuccessResponse,
  Employee,
  EmployeeFormPayload,
  EmployeeListData,
  EmployeeOptions,
  ListEmployeesParams,
} from '../../types/employee.type';
import { asyncHandlerClient } from '../../utils/async-handler';
import ApiClient from '../../utils/axios-client';

const listEmployeesService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<Array<Employee>>>('/employees');

  return response.data;
});

const listPaginatedEmployeesService = asyncHandlerClient(
  async (params: ListEmployeesParams) => {
    const response = await ApiClient.get<ApiSuccessResponse<EmployeeListData>>(
      '/employees',
      {
        params,
      },
    );

    return response.data;
  },
);

const getEmployeeOptionsService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<EmployeeOptions>>(
      '/employees/options',
    );

  return response.data;
});

const createEmployeeService = asyncHandlerClient(
  async (data: EmployeeFormPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<Employee>>(
      '/employees',
      data,
    );

    return response.data;
  },
);

const inviteEmployeeService = asyncHandlerClient(
  async (data: EmployeeFormPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<Employee>>(
      '/employees/invite',
      data,
    );

    return response.data;
  },
);

const updateEmployeeService = asyncHandlerClient(
  async (employeeId: string, data: Partial<EmployeeFormPayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<Employee>>(
      `/employees/${employeeId}`,
      data,
    );

    return response.data;
  },
);

const deleteEmployeeService = asyncHandlerClient(async (employeeId: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<null>>(
    `/employees/${employeeId}`,
  );

  return response.data;
});

export {
  createEmployeeService,
  deleteEmployeeService,
  getEmployeeOptionsService,
  inviteEmployeeService,
  listPaginatedEmployeesService,
  listEmployeesService,
  updateEmployeeService,
};

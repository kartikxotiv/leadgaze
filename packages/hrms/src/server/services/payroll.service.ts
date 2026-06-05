/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ApiSuccessResponse,
  PayrollDashboardResponse,
  PayrollRunCreatePayload,
} from '../../types/payroll.type';
import { asyncHandlerClient } from '../../utils/async-handler';
import ApiClient from '../../utils/axios-client';

// Dashboard
const getPayrollDashboardService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<PayrollDashboardResponse>>(
      '/payroll',
    );

  return response.data;
});

const createPayrollRunService = asyncHandlerClient(
  async (payload: PayrollRunCreatePayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      '/payroll',
      payload,
    );

    return response.data;
  },
);

// Salary Structures
const listSalaryStructuresService = asyncHandlerClient(async () => {
  const response = await ApiClient.get<ApiSuccessResponse<any[]>>(
    '/payroll/salary-structures',
  );

  return response.data;
});

const createSalaryStructureService = asyncHandlerClient(
  async (payload: {
    name: string;
    description?: string;
    currency_code: string;
    is_active: boolean;
  }) => {
    const response = await ApiClient.post<ApiSuccessResponse<any>>(
      '/payroll/salary-structures',
      payload,
    );

    return response.data;
  },
);

// Salary Components
const listSalaryComponentsService = asyncHandlerClient(async () => {
  const response = await ApiClient.get<ApiSuccessResponse<any[]>>(
    '/payroll/salary-components',
  );

  return response.data;
});

const createSalaryComponentService = asyncHandlerClient(
  async (payload: {
    code: string;
    name: string;
    type: 'earning' | 'deduction' | 'employer_contribution';
    taxable: boolean;
    is_statutory: boolean;
    is_active: boolean;
  }) => {
    const response = await ApiClient.post<ApiSuccessResponse<any>>(
      '/payroll/salary-components',
      payload,
    );

    return response.data;
  },
);

// Employee Compensation
const listEmployeeCompensationService = asyncHandlerClient(async () => {
  const response = await ApiClient.get<ApiSuccessResponse<any[]>>(
    '/payroll/employee-compensation',
  );

  return response.data;
});

const createEmployeeCompensationService = asyncHandlerClient(
  async (payload: {
    employee_id: string;
    salary_structure_id?: string;
    assignment_type: string;
    pay_frequency: string;
    annual_ctc?: number;
    monthly_gross?: number;
    effective_from: string;
    effective_to?: string;
    notes?: string;
  }) => {
    const response = await ApiClient.post<ApiSuccessResponse<any>>(
      '/payroll/employee-compensation',
      payload,
    );

    return response.data;
  },
);

const listSalaryStructureComponentsService = asyncHandlerClient(
  async (structureId: string) => {
    const response = await ApiClient.get<ApiSuccessResponse<any[]>>(
      `/payroll/salary-structures/${structureId}/components`,
    );

    return response.data;
  },
);

const addSalaryStructureComponentService = asyncHandlerClient(
  async (params: {
    structureId: string;
    payload: {
      salary_component_id: string;
      calculation_type: string;
      calculation_value: number;
      is_recurring?: boolean;
      is_pro_ratable?: boolean;
      display_order?: number;
    };
  }) => {
    const response = await ApiClient.post<ApiSuccessResponse<any>>(
      `/payroll/salary-structures/${params.structureId}/components`,
      params.payload,
    );

    return response.data;
  },
);

const createEmployeePayItemService = asyncHandlerClient(
  async (payload: {
    employee_id: string;
    salary_component_id: string;
    amount: number;
    effective_date: string;
    notes?: string;
  }) => {
    const response = await ApiClient.post<ApiSuccessResponse<any>>(
      '/payroll/pay-items',
      payload,
    );

    return response.data;
  },
);

const listPayslipsService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<any[]>>('/payroll/payslips');

  return response.data;
});

const listPayslipComponentsService = asyncHandlerClient(
  async (payslipId: string) => {
    const response = await ApiClient.get<ApiSuccessResponse<any[]>>(
      `/payroll/payslips/${payslipId}/components`,
    );

    return response.data;
  },
);

const updateSalaryStructureService = asyncHandlerClient(
  async (id: string, payload: any) => {
    const response = await ApiClient.patch<ApiSuccessResponse<any>>(
      `/payroll/salary-structures/${id}`,
      payload,
    );
    return response.data;
  },
);

const deleteSalaryStructureService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<any>>(
    `/payroll/salary-structures/${id}`,
  );
  return response.data;
});

const updateSalaryComponentService = asyncHandlerClient(
  async (id: string, payload: any) => {
    const response = await ApiClient.patch<ApiSuccessResponse<any>>(
      `/payroll/salary-components/${id}`,
      payload,
    );
    return response.data;
  },
);

const deleteSalaryComponentService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<any>>(
    `/payroll/salary-components/${id}`,
  );
  return response.data;
});

const updateEmployeeCompensationService = asyncHandlerClient(
  async (id: string, payload: any) => {
    const response = await ApiClient.patch<ApiSuccessResponse<any>>(
      `/payroll/employee-compensation/${id}`,
      payload,
    );
    return response.data;
  },
);

const deleteEmployeeCompensationService = asyncHandlerClient(
  async (id: string) => {
    const response = await ApiClient.delete<ApiSuccessResponse<any>>(
      `/payroll/employee-compensation/${id}`,
    );
    return response.data;
  },
);

const updateEmployeePayItemService = asyncHandlerClient(
  async (id: string, payload: any) => {
    const response = await ApiClient.patch<ApiSuccessResponse<any>>(
      `/payroll/pay-items/${id}`,
      payload,
    );
    return response.data;
  },
);

const deleteEmployeePayItemService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<any>>(
    `/payroll/pay-items/${id}`,
  );
  return response.data;
});

const approvePayrollRunService = asyncHandlerClient(async (runId: string) => {
  const response = await ApiClient.post<ApiSuccessResponse<any>>(
    `/payroll/${runId}/approve`,
    {},
  );

  return response.data;
});

export {
  getPayrollDashboardService,
  createPayrollRunService,
  listSalaryStructuresService,
  createSalaryStructureService,
  listSalaryComponentsService,
  createSalaryComponentService,
  listEmployeeCompensationService,
  createEmployeeCompensationService,
  approvePayrollRunService,
  listSalaryStructureComponentsService,
  addSalaryStructureComponentService,
  createEmployeePayItemService,
  listPayslipsService,
  listPayslipComponentsService,
  updateSalaryStructureService,
  deleteSalaryStructureService,
  updateSalaryComponentService,
  deleteSalaryComponentService,
  updateEmployeeCompensationService,
  deleteEmployeeCompensationService,
  updateEmployeePayItemService,
  deleteEmployeePayItemService,
};

import { useCallback, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import ApiClient from '~/utils/axios-client';

import type {
  ApiResponse,
  AssetClearanceOption,
  EmployeeOption,
  ExitChecklistItemOption,
  ExitChecklistOption,
  ExitLetterOption,
  FnfSettlementOption,
  PayrollRunOption,
  ResignationOption,
} from '../types';

type UseSeparationDataOptions = {
  canLoadAssetClearances: boolean;
  canLoadChecklists: boolean;
  canLoadEmployees: boolean;
  canLoadExitLetters: boolean;
  canLoadFnfSettlements: boolean;
  canLoadPayrollRuns: boolean;
  currentEmployeeId: string | null;
};

type SeparationData = {
  employees: EmployeeOption[];
  noticeEmployees: EmployeeOption[];
  resignations: ResignationOption[];
  exitChecklists: ExitChecklistOption[];
  exitChecklistItems: ExitChecklistItemOption[];
  assetClearances: AssetClearanceOption[];
  fnfSettlements: FnfSettlementOption[];
  payrollRuns: PayrollRunOption[];
  letters: ExitLetterOption[];
};

const emptySeparationData: SeparationData = {
  employees: [],
  noticeEmployees: [],
  resignations: [],
  exitChecklists: [],
  exitChecklistItems: [],
  assetClearances: [],
  fnfSettlements: [],
  payrollRuns: [],
  letters: [],
};

async function getApiData<T>(path: string, enabled = true): Promise<T[]> {
  if (!enabled) {
    return [];
  }

  const response = await ApiClient.get<ApiResponse<T[]>>(path);

  return Array.isArray(response.data.data) ? response.data.data : [];
}

async function getSeparationData(
  options: UseSeparationDataOptions,
): Promise<SeparationData> {
  const [
    employees,
    noticeEmployees,
    resignations,
    exitChecklists,
    exitChecklistItems,
    assetClearances,
    fnfSettlements,
    payrollRuns,
    letters,
  ] = await Promise.all([
    getApiData<EmployeeOption>(
      '/employees?excludeRole=admin&status=active,probation',
      options.canLoadEmployees,
    ),
    getApiData<EmployeeOption>(
      '/employees?excludeRole=admin&status=notice',
      options.canLoadEmployees,
    ),
    getApiData<ResignationOption>('/resignations'),
    getApiData<ExitChecklistOption>(
      '/exit-checklists',
      options.canLoadChecklists,
    ),
    getApiData<ExitChecklistItemOption>(
      '/exit-checklist-items',
      options.canLoadChecklists,
    ),
    getApiData<AssetClearanceOption>(
      '/asset-clearances',
      options.canLoadAssetClearances,
    ),
    getApiData<FnfSettlementOption>(
      '/fnf-settlements',
      options.canLoadFnfSettlements,
    ),
    getApiData<PayrollRunOption>('/payroll/runs', options.canLoadPayrollRuns),
    getApiData<ExitLetterOption>('/exit-letters', options.canLoadExitLetters),
  ]);

  return {
    employees,
    noticeEmployees,
    resignations,
    exitChecklists,
    exitChecklistItems,
    assetClearances,
    fnfSettlements,
    payrollRuns,
    letters,
  };
}

export function useSeparationData(options: UseSeparationDataOptions) {
  const separationDataQuery = useQuery({
    queryKey: [
      'separation-data',
      options.canLoadAssetClearances,
      options.canLoadChecklists,
      options.canLoadEmployees,
      options.canLoadExitLetters,
      options.canLoadFnfSettlements,
      options.canLoadPayrollRuns,
    ],
    queryFn: () => getSeparationData(options),
  });
  const { data, errorUpdatedAt, isFetching, refetch } = separationDataQuery;

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    if (errorUpdatedAt > 0) {
      toast.error('Failed to load separation data');
    }
  }, [errorUpdatedAt]);

  const separationData = data ?? emptySeparationData;

  return {
    employees: separationData.employees,
    noticeEmployees: separationData.noticeEmployees,
    resignations: separationData.resignations,
    exitChecklists: separationData.exitChecklists,
    exitChecklistItems: separationData.exitChecklistItems,
    assetClearances: separationData.assetClearances,
    fnfSettlements: separationData.fnfSettlements,
    payrollRuns: separationData.payrollRuns,
    letters: separationData.letters,
    currentEmployeeId: options.currentEmployeeId,
    refresh,
    isLoading: isFetching,
  };
}

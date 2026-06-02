'use client';

import { useMutation } from '@tanstack/react-query';

import { showToast } from '~/components/global/ToastAlert';
import type { ApiSuccessResponse } from '~/types/recruitment.type';
import { handleApiResponse } from '~/utils/api-response-handler';

export function useRecruitmentMutation<TVariables, TData = unknown>(params: {
  errorMessage: string;
  invalidate: () => Promise<unknown>;
  mutationFn: (variables: TVariables) => Promise<ApiSuccessResponse<TData>>;
  onSuccess?: () => void;
}) {
  return useMutation({
    mutationFn: params.mutationFn,
    onError: (error: { message?: string }) => {
      showToast(error.message ?? params.errorMessage, 'error');
    },
    onSuccess: async (response: ApiSuccessResponse<TData>) => {
      handleApiResponse(response);
      params.onSuccess?.();
      await params.invalidate();
    },
  });
}

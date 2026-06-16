'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { showToast } from '../components/global/ToastAlert';
import {
  createSelfServiceRequestService,
  downloadSelfServicePayslipService,
  getSelfServiceDashboardService,
  updateSelfServiceProfileService,
} from '../server/services/self-service.service';
import type {
  SelfServicePayslipSummary,
  SelfServiceProfileUpdatePayload,
  SelfServiceRequestCreatePayload,
} from '../types/self-service.type';
import { handleApiResponse } from '../utils/api-response-handler';

export function useSelfServicePage(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isPayslipDialogOpen, setIsPayslipDialogOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] =
    useState<SelfServicePayslipSummary | null>(null);

  const dashboardQuery = useQuery({
    enabled: options?.enabled ?? true,
    queryKey: ['self-service-dashboard'],
    queryFn: getSelfServiceDashboardService,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: SelfServiceProfileUpdatePayload) =>
      updateSelfServiceProfileService(payload),
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to update personal details', 'error');
    },
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsProfileDialogOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ['self-service-dashboard'],
      });
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: (payload: SelfServiceRequestCreatePayload) =>
      createSelfServiceRequestService(payload),
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to raise HR request', 'error');
    },
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsRequestDialogOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ['self-service-dashboard'],
      });
    },
  });

  const handleDownloadPayslip = async (payslipId: string) => {
    try {
      const { blob, fileName } =
        await downloadSelfServicePayslipService(payslipId);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Unable to download payslip';

      showToast(message, 'error');
    }
  };

  return {
    createRequestMutation,
    dashboardData: dashboardQuery.data?.data,
    dashboardQuery,
    isPayslipDialogOpen,
    isProfileDialogOpen,
    isRequestDialogOpen,
    selectedPayslip,
    setIsPayslipDialogOpen,
    setIsProfileDialogOpen,
    setIsRequestDialogOpen,
    setSelectedPayslip,
    updateProfileMutation,
    handleDownloadPayslip,
    openPayslipDetails: (payslip: SelfServicePayslipSummary) => {
      setSelectedPayslip(payslip);
      setIsPayslipDialogOpen(true);
    },
  };
}

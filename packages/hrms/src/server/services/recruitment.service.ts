import { asyncHandlerClient } from '~/utils/async-handler';

import type {
  ApiSuccessResponse,
  RecruitmentCandidateNotePayload,
  RecruitmentCandidatePayload,
  RecruitmentDashboardResponse,
  RecruitmentFeedbackPayload,
  RecruitmentInterviewPayload,
  RecruitmentOfferPayload,
  RecruitmentOnboardingTaskPayload,
  RecruitmentOptionsResponse,
  RecruitmentRequisitionPayload,
} from '~/types/recruitment.type';

import ApiClient from '../utils/axios-client';

const getRecruitmentDashboardService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<RecruitmentDashboardResponse>>(
      '/recruitment',
    );

  return response.data;
});

const getRecruitmentOptionsService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<RecruitmentOptionsResponse>>(
      '/recruitment/options',
    );

  return response.data;
});

const createRecruitmentRequisitionService = asyncHandlerClient(
  async (payload: RecruitmentRequisitionPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      '/recruitment',
      payload,
    );

    return response.data;
  },
);

const updateRecruitmentRequisitionService = asyncHandlerClient(
  async (id: string, payload: Partial<RecruitmentRequisitionPayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<unknown>>(
      `/recruitment/requisitions/${id}`,
      payload,
    );

    return response.data;
  },
);

const deleteRecruitmentRequisitionService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<null>>(
    `/recruitment/requisitions/${id}`,
  );

  return response.data;
});

const createRecruitmentCandidateService = asyncHandlerClient(
  async (payload: RecruitmentCandidatePayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      '/recruitment/candidates',
      payload,
    );

    return response.data;
  },
);

const updateRecruitmentCandidateService = asyncHandlerClient(
  async (id: string, payload: Partial<RecruitmentCandidatePayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<unknown>>(
      `/recruitment/candidates/${id}`,
      payload,
    );

    return response.data;
  },
);

const deleteRecruitmentCandidateService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<null>>(
    `/recruitment/candidates/${id}`,
  );

  return response.data;
});

const createRecruitmentCandidateNoteService = asyncHandlerClient(
  async (candidateId: string, payload: RecruitmentCandidateNotePayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      `/recruitment/candidates/${candidateId}/notes`,
      payload,
    );

    return response.data;
  },
);

const createRecruitmentInterviewService = asyncHandlerClient(
  async (payload: RecruitmentInterviewPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      '/recruitment/interviews',
      payload,
    );

    return response.data;
  },
);

const updateRecruitmentInterviewService = asyncHandlerClient(
  async (id: string, payload: Partial<RecruitmentInterviewPayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<unknown>>(
      `/recruitment/interviews/${id}`,
      payload,
    );

    return response.data;
  },
);

const deleteRecruitmentInterviewService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<null>>(
    `/recruitment/interviews/${id}`,
  );

  return response.data;
});

const createRecruitmentFeedbackService = asyncHandlerClient(
  async (payload: RecruitmentFeedbackPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      '/recruitment/feedback',
      payload,
    );

    return response.data;
  },
);

const createRecruitmentOfferService = asyncHandlerClient(
  async (payload: RecruitmentOfferPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      '/recruitment/offers',
      payload,
    );

    return response.data;
  },
);

const updateRecruitmentOfferService = asyncHandlerClient(
  async (id: string, payload: Partial<RecruitmentOfferPayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<unknown>>(
      `/recruitment/offers/${id}`,
      payload,
    );

    return response.data;
  },
);

const deleteRecruitmentOfferService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<null>>(
    `/recruitment/offers/${id}`,
  );

  return response.data;
});

const createRecruitmentOnboardingTaskService = asyncHandlerClient(
  async (payload: RecruitmentOnboardingTaskPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<unknown>>(
      '/recruitment/onboarding-tasks',
      payload,
    );

    return response.data;
  },
);

const updateRecruitmentOnboardingTaskService = asyncHandlerClient(
  async (id: string, payload: Partial<RecruitmentOnboardingTaskPayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<unknown>>(
      `/recruitment/onboarding-tasks/${id}`,
      payload,
    );

    return response.data;
  },
);

const deleteRecruitmentOnboardingTaskService = asyncHandlerClient(
  async (id: string) => {
    const response = await ApiClient.delete<ApiSuccessResponse<null>>(
      `/recruitment/onboarding-tasks/${id}`,
    );

    return response.data;
  },
);

export {
  createRecruitmentCandidateNoteService,
  createRecruitmentCandidateService,
  createRecruitmentFeedbackService,
  createRecruitmentInterviewService,
  createRecruitmentOfferService,
  createRecruitmentOnboardingTaskService,
  createRecruitmentRequisitionService,
  deleteRecruitmentCandidateService,
  deleteRecruitmentInterviewService,
  deleteRecruitmentOfferService,
  deleteRecruitmentOnboardingTaskService,
  deleteRecruitmentRequisitionService,
  getRecruitmentDashboardService,
  getRecruitmentOptionsService,
  updateRecruitmentCandidateService,
  updateRecruitmentInterviewService,
  updateRecruitmentOfferService,
  updateRecruitmentOnboardingTaskService,
  updateRecruitmentRequisitionService,
};

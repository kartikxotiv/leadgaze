import ApiClient from '../utils/axios-client';
import { asyncHandlerClient } from '~/utils/async-handler';
import type { ApiSuccessResponse } from '~/types/document.type';

export type UploadResponse = {
  url: string;
  name: string;
  type: string;
};

const uploadFileService = asyncHandlerClient(async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await ApiClient.post<ApiSuccessResponse<UploadResponse>>(
    '/upload',
    formData,
  );

  return response.data;
});

export { uploadFileService };

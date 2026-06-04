import { asyncHandlerClient } from '../../utils/async-handler';
import type { ApiSuccessResponse } from '../../types/document.type';
import ApiClient from '../../utils/axios-client';

export type UploadResponse = {
  name: string;
  type: string;
  url: string;
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

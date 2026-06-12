import { asyncHandlerClient } from '../../utils/async-handler';
import type {
  ApiSuccessResponse,
  DocumentFormPayload,
  EmployeeDocument,
} from '../../types/document.type';
import ApiClient from '../../utils/axios-client';

const listDocumentsService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<Array<EmployeeDocument>>>(
      '/documents',
    );

  return response.data;
});

const createDocumentService = asyncHandlerClient(
  async (data: DocumentFormPayload) => {
    const response = await ApiClient.post<ApiSuccessResponse<EmployeeDocument>>(
      '/documents',
      data,
    );

    return response.data;
  },
);

const updateDocumentService = asyncHandlerClient(
  async (documentId: string, data: Partial<DocumentFormPayload>) => {
    const response = await ApiClient.patch<ApiSuccessResponse<EmployeeDocument>>(
      `/documents/${documentId}`,
      data,
    );

    return response.data;
  },
);

const deleteDocumentService = asyncHandlerClient(async (documentId: string) => {
  const response = await ApiClient.delete<ApiSuccessResponse<null>>(
    `/documents/${documentId}`,
  );

  return response.data;
});

export {
  createDocumentService,
  deleteDocumentService,
  listDocumentsService,
  updateDocumentService,
};

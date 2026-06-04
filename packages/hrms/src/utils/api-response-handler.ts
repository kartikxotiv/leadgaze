import { showToast } from '../components/global/ToastAlert';

export type HrmsApiResponse = {
  message?: string | null;
  error?: string | null;
  status?: number | string | boolean;
  statusCode?: number | string;
  success?: boolean;
};

export function isSuccessfulHrmsApiResponse(response: HrmsApiResponse) {
  return Boolean(
    response.success ||
      response.status === true ||
      response.statusCode === 200 ||
      response.status === 200,
  );
}

export function handleApiResponse(response: HrmsApiResponse) {
  const message = response.message || response.error || 'Request completed';

  showToast(
    message,
    isSuccessfulHrmsApiResponse(response) ? 'success' : 'error',
  );
}

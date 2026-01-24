import { showToast } from '../components/global/ToastAlert';

const handleApiResponse = (res: {
  message: string;
  error: string | null | undefined;
  status: number | string;
  statusCode: number | string;
}) => {
  console.log({ res });
  if (res?.statusCode == 200 || res?.status) {
    showToast(res?.message, 'success');
  } else {
    showToast(res?.error ?? res?.message, 'error');
  }
};
export { handleApiResponse };

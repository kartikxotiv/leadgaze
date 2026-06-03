import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export function showToast(
  message?: string | null,
  type: ToastType = 'success',
) {
  const normalizedMessage = message || 'Request completed';

  if (type === 'error') {
    toast.error(normalizedMessage);
    return;
  }

  if (type === 'warning') {
    toast.warning(normalizedMessage);
    return;
  }

  if (type === 'info') {
    toast.info(normalizedMessage);
    return;
  }

  toast.success(normalizedMessage);
}

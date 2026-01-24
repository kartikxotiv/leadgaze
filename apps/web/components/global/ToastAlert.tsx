import React from 'react';

import { AlertTriangle, CheckCircle, CircleAlert, Info } from 'lucide-react';
import { toast } from 'sonner';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type ToastOptions = {
  description?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
};

const toastIcons = {
  success: <CheckCircle className="text-green-500" />,
  error: <CircleAlert className="text-red-500" />,
  warning: <AlertTriangle className="text-yellow-500" />,
  info: <Info className="text-blue-500" />,
};

export const showToast = (
  message: string,
  variant: ToastVariant = 'info',
  options?: ToastOptions,
) => {
  return toast(message, {
    description: options?.description,
    position: options?.position ?? 'top-right',
    icon: toastIcons[variant],
  });
};

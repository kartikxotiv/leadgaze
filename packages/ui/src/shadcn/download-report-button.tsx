'use client';

import * as React from 'react';
import { Download } from 'lucide-react';

import { Button, ButtonProps } from './button';

export interface DownloadReportButtonProps {
  onDownload: () => Promise<void> | void;
  isGenerating?: boolean;
  disabled?: boolean;
  text?: string;
  variant?: ButtonProps['variant'];
  className?: string;
}

export function DownloadReportButton({
  onDownload,
  isGenerating = false,
  disabled = false,
  text,
  variant = 'outline',
  className,
}: DownloadReportButtonProps) {
  const iconOnly = !text;
  return (
    <Button
      variant={variant}
      size={iconOnly ? 'icon' : 'default'}
      className={className || "secondary-text-small-bold border-light-gray shrink-0 dark:text-white"}
      onClick={onDownload}
      disabled={isGenerating || disabled}
      title={text || 'Download Report'}
    >
      <Download className="h-4 w-4 border-light-gray primary-text-medium text-leadgaze-dark dark:text-white" />
      {!iconOnly && text && <span className="ml-2">{isGenerating ? 'Generating...' : text}</span>}
    </Button>
  );
}

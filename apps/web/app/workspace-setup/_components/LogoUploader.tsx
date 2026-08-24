'use client';

import * as React from 'react';
import { Download, UploadCloud, X } from 'lucide-react';
import Image from 'next/image';

interface LogoUploaderProps {
  companyName: string;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  initialLogoUrl?: string | null;
}

export function LogoUploader({ companyName, onFileSelect, disabled, initialLogoUrl }: LogoUploaderProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(initialLogoUrl || null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (initialLogoUrl) {
      setPreviewUrl(initialLogoUrl);
    }
  }, [initialLogoUrl]);

  const initial = companyName ? companyName.charAt(0).toUpperCase() : 'W';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    if (!file.type.match(/image\/(jpeg|png|gif|webp)/)) {
      setError('Only JPG, PNG, GIF, and WEBP formats are supported');
      return;
    }

    setError(null);
    onFileSelect(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2 mb-2">
      <div className={`relative h-14 w-14 shrink-0 overflow-hidden ${previewUrl ? '' : 'bg-leadgaze-primary'} shadow-[var(--color-leadgaze-primary)]/20 shadow-lg flex items-center justify-center text-white text-3xl font-semibold`}>
        {previewUrl ? (
          <Image src={previewUrl} alt="Logo preview" fill className="object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      <div className="flex flex-col gap-1 justify-center">
        <div className="flex items-center gap-2">
          <p className="primary-text-big-regular text-leadgaze-dark tracking-tight dark:text-white">Company logo</p>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50 transition-colors"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            title="Upload Logo"
          >
            <Download className="h-4 w-4 rotate-180" />
          </button>
        </div>
        <p className="text-xs text-slate-500">We support PNGs, JPEGs and GIFs under 2MB. Recommended size is 400x400px.</p>

        <div className="flex gap-2 items-center mt-1">
          <input
            type="file"
            ref={inputRef}
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileChange}
            disabled={disabled}
          />
          {previewUrl && (
            <button
              type="button"
              className="text-sm px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 font-medium disabled:opacity-50 transition-colors mt-2"
              onClick={handleClear}
              disabled={disabled}
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  );
}

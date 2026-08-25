'use client';

import { useCallback, useRef, useState } from 'react';

import { FileText, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';

export const EMAIL_ATTACHMENTS_BUCKET = 'email_attachments';
export const MAX_EMAIL_ATTACHMENT_COUNT = 5;
export const MAX_EMAIL_ATTACHMENT_SIZE = 10 * 1024 * 1024;
export const MAX_TOTAL_EMAIL_ATTACHMENT_SIZE = 15 * 1024 * 1024;

export interface UploadedEmailAttachment {
  name: string;
  path: string;
  contentType: string;
  size: number;
}

function attachmentKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function safeFileName(fileName: string) {
  return (
    fileName
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .slice(-180) || 'attachment'
  );
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function useEmailAttachments(workspaceId: string) {
  const supabase = useSupabase();
  const [files, setFiles] = useState<File[]>([]);

  const addFiles = useCallback(
    (incomingFiles: File[]) => {
      const existingKeys = new Set(files.map(attachmentKey));
      const uniqueIncomingFiles = incomingFiles.filter(
        (file) => !existingKeys.has(attachmentKey(file)),
      );
      const nextFiles = [...files, ...uniqueIncomingFiles];

      if (nextFiles.length > MAX_EMAIL_ATTACHMENT_COUNT) {
        throw new Error(
          `You can attach up to ${MAX_EMAIL_ATTACHMENT_COUNT} files`,
        );
      }

      const emptyFile = nextFiles.find((file) => file.size === 0);
      if (emptyFile) {
        throw new Error(`${emptyFile.name} is empty and cannot be attached`);
      }

      const oversizedFile = nextFiles.find(
        (file) => file.size > MAX_EMAIL_ATTACHMENT_SIZE,
      );
      if (oversizedFile) {
        throw new Error(
          `${oversizedFile.name} exceeds the 10 MB attachment limit`,
        );
      }

      const totalSize = nextFiles.reduce((sum, file) => sum + file.size, 0);
      if (totalSize > MAX_TOTAL_EMAIL_ATTACHMENT_SIZE) {
        throw new Error('The combined attachment size cannot exceed 15 MB');
      }

      setFiles(nextFiles);
    },
    [files],
  );

  const removeFile = useCallback((fileToRemove: File) => {
    const keyToRemove = attachmentKey(fileToRemove);
    setFiles((currentFiles) =>
      currentFiles.filter((file) => attachmentKey(file) !== keyToRemove),
    );
  }, []);

  const clearFiles = useCallback(() => setFiles([]), []);

  const removeUploadedFiles = useCallback(
    async (attachments: UploadedEmailAttachment[]) => {
      const paths = attachments.map((attachment) => attachment.path);
      if (paths.length === 0) return;

      const { error } = await supabase.storage
        .from(EMAIL_ATTACHMENTS_BUCKET)
        .remove(paths);

      if (error) {
        console.error('Failed to clean up uploaded attachments:', error);
      }
    },
    [supabase],
  );

  const uploadFiles = useCallback(async (): Promise<
    UploadedEmailAttachment[]
  > => {
    if (files.length === 0) return [];

    const uploaded: UploadedEmailAttachment[] = [];

    for (const file of files) {
      const safeName = safeFileName(file.name);
      const extension = safeName.includes('.')
        ? `.${safeName.split('.').pop()}`
        : '';
      const baseName = safeName.includes('.')
        ? safeName.slice(0, safeName.lastIndexOf('.'))
        : safeName;
      const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const filePath = `${workspaceId}/${baseName}-${uniqueSuffix}${extension}`;

      const { error } = await supabase.storage
        .from(EMAIL_ATTACHMENTS_BUCKET)
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (error) {
        if (uploaded.length > 0) {
          await removeUploadedFiles(uploaded);
        }
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      uploaded.push({
        name: file.name,
        path: filePath,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });
    }

    return uploaded;
  }, [files, removeUploadedFiles, supabase, workspaceId]);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    removeUploadedFiles,
  };
}

export function EmailAttachmentChips({
  files,
  disabled,
  onRemoveFile,
}: {
  files: File[];
  disabled?: boolean;
  onRemoveFile: (file: File) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 custom-spacing-x-y border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
      {files.map((file) => (
        <div
          key={attachmentKey(file)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 shadow-2xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="max-w-[140px] truncate font-medium">{file.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            ({formatFileSize(file.size)})
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemoveFile(file)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-700 transition-colors"
            title={`Remove ${file.name}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function EmailAttachmentPicker({
  files,
  disabled,
  onAddFiles,
  onRemoveFile,
}: {
  files: File[];
  disabled?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-leadgaze-dark dark:text-white">Attachments</p>
          <p className="text-muted-foreground text-xs">
            Up to 5 files, 10 MB each and 15 MB total
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="mr-2 h-4 w-4" />
          Attach files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            try {
              onAddFiles(Array.from(event.target.files ?? []));
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Failed to add attachment',
              );
            } finally {
              event.target.value = '';
            }
          }}
        />
      </div>

      <EmailAttachmentChips
        files={files}
        disabled={disabled}
        onRemoveFile={onRemoveFile}
      />
    </div>
  );
}

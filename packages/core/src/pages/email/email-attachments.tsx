'use client';

import { useCallback, useRef, useState } from 'react';

import { Paperclip, X } from 'lucide-react';
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

function formatFileSize(size: number) {
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
        console.error(
          '[email-attachments] Failed to remove uploaded files:',
          error,
        );
      }
    },
    [supabase],
  );

  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return [];
    if (!workspaceId) throw new Error('Workspace is required to upload files');

    const bucket = supabase.storage.from(EMAIL_ATTACHMENTS_BUCKET);
    const uploadedAttachments: UploadedEmailAttachment[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        const path = `${workspaceId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const contentType = file.type || 'application/octet-stream';
        const { error: uploadError } = await bucket.upload(path, file, {
          cacheControl: '3600',
          contentType,
          upsert: false,
        });

        if (uploadError) throw uploadError;
        uploadedPaths.push(path);

        uploadedAttachments.push({
          name: file.name,
          path,
          contentType,
          size: file.size,
        });
      }

      return uploadedAttachments;
    } catch (error) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await bucket.remove(uploadedPaths);
        if (cleanupError) {
          console.error(
            '[email-attachments] Failed to clean up partial upload:',
            cleanupError,
          );
        }
      }
      throw error;
    }
  }, [files, supabase, workspaceId]);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    uploadFiles,
    removeUploadedFiles,
  };
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
          <p className="text-sm font-medium text-leadaze-dark dark:text-white">Attachments</p>
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

      {files.length > 0 ? (
        <div className="space-y-2 rounded-md border p-2">
          {files.map((file) => (
            <div
              key={attachmentKey(file)}
              className="flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-1.5 text-sm dark:bg-zinc-900"
            >
              <Paperclip className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate" title={file.name}>
                {file.name}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {formatFileSize(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={disabled}
                onClick={() => onRemoveFile(file)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

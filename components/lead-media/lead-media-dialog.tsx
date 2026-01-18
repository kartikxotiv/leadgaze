"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Upload,
  Eye,
  Trash2,
  FileText,
  Image,
  FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";
import { useAuthStore } from "@/lib/stores/auth-store";

interface LeadMedia {
  id: string;
  lead_id: string;
  media_url: string;
  media_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onSuccess?: () => void;
}

function formatTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    return (
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }) +
      " at " +
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  } catch (error) {
    return "Recently";
  }
}

function getFileIcon(mediaType: string) {
  if (mediaType.startsWith("image/")) {
    return Image;
  }
  if (mediaType.includes("pdf")) {
    return FileText;
  }
  if (mediaType.includes("word") || mediaType.includes("document")) {
    return FileText;
  }
  return FileIcon;
}

function getFileTypeLabel(mediaType: string): string {
  if (mediaType.startsWith("image/")) {
    return "Image";
  }
  if (mediaType.includes("pdf")) {
    return "PDF";
  }
  if (mediaType.includes("word") || mediaType.includes("document")) {
    return "Document";
  }
  if (mediaType.includes("excel") || mediaType.includes("spreadsheet")) {
    return "Spreadsheet";
  }
  return "File";
}

function MediaCard({
  media,
  onDelete,
  isDeleting,
}: {
  media: LeadMedia;
  onDelete: (mediaId: string) => void;
  isDeleting?: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const timestamp = formatTimestamp(media.created_at);
  const FileIconComponent = getFileIcon(media.media_type);
  const fileTypeLabel = getFileTypeLabel(media.media_type);
  const fileName = media.media_url.split("/").pop() || "file";
  const isImage = media.media_type.startsWith("image/");

  return (
    <div className="group relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 hover:shadow-lg transition-all duration-200">
      {isImage ? (
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
          {imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Image className="h-8 w-8 text-gray-400" />
              <span className="text-xs text-gray-500">Image not available</span>
            </div>
          ) : (
            <>
              <img
                src={media.media_url}
                alt={fileName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-white hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(media.media_url, "_blank");
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-white hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(media.id);
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-3">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="h-12 w-12 rounded bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <FileIconComponent className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="w-full min-w-0">
              <h4 className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate px-1">
                {fileName}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {fileTypeLabel}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => window.open(media.media_url, "_blank")}
              >
                <Eye className="h-3 w-3 text-gray-500 hover:text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onDelete(media.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-3 w-3 text-gray-500 hover:text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="truncate block">{fileName}</span>
        <span className="text-gray-300">{timestamp}</span>
      </div>
    </div>
  );
}

export function LeadMediaDialogTrigger({
  leadId,
  onSuccess,
}: {
  leadId: string;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        Upload Files
      </Button>
      <LeadMediaDialog
        open={open}
        onOpenChange={setOpen}
        leadId={leadId}
        onSuccess={onSuccess}
      />
    </>
  );
}

export function LeadMediaDialog({
  open,
  onOpenChange,
  leadId,
  onSuccess,
}: LeadMediaDialogProps) {
  const [mediaList, setMediaList] = useState<LeadMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    mediaId?: string;
    fileName?: string;
  }>({ open: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  const fetchMedia = async () => {
    if (!leadId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/lead-media?leadId=${leadId}`);
      const result = await response.json();

      if (result.success) {
        setMediaList(result.data.media || []);
      } else {
        toast.error(result.error || "Failed to fetch media");
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Failed to fetch media");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && leadId) {
      fetchMedia();
    }
  }, [open, leadId]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (3MB limit)
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 3MB limit");
      return;
    }

    // Validate file type (allow common document and image types)
    const allowedTypes = [
      "image/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/",
    ];

    const isValidType = allowedTypes.some((type) => file.type.startsWith(type));
    if (!isValidType) {
      toast.error(
        "File type not supported. Please upload images, PDFs, or documents."
      );
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("leadId", leadId);
      if (user?.userId) {
        formData.append("createdBy", user.userId);
      }

      const response = await fetch("/api/lead-media/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success("File uploaded successfully");
        await fetchMedia();
        onSuccess?.();
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.error(result.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/lead-media/${mediaId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("File deleted successfully");
        await fetchMedia();
        onSuccess?.();
        setDeleteDialog({ open: false });
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  const images = mediaList.filter((m) => m.media_type.startsWith("image/"));
  const documents = mediaList.filter((m) => !m.media_type.startsWith("image/"));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
          <div className="px-6 pt-6 pb-4 border-b flex justify-between  gap-2">
            <div>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Media Library
                </div>
                {mediaList.length > 0 && (
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{mediaList.length} items</span>
                    <span>•</span>
                    <span>{images.length} images</span>
                    <span>•</span>
                    <span>{documents.length} documents</span>
                  </div>
                )}
              </DialogTitle>
              <DialogDescription>
                Upload and manage files for this lead
              </DialogDescription>
            </div>

            <div className="flex justify-end">
              <Button
                className="inline-block w-fit flex items-center gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
            disabled={isUploading}
          />

          {/* Upload Status */}
          {isUploading && (
            <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Uploading file...
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Files Grid - Bottom */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : mediaList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-6 mb-4">
                    <FileIcon className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-1">
                    No files uploaded yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click "Upload Files" button to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {mediaList.map((media) => (
                    <MediaCard
                      key={media.id}
                      media={media}
                      onDelete={(id) => {
                        const fileName =
                          media.media_url.split("/").pop() || "file";
                        setDeleteDialog({
                          open: true,
                          mediaId: id,
                          fileName,
                        });
                      }}
                      isDeleting={isDeleting}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open })}
        itemName={deleteDialog.fileName || "this file"}
        itemId={deleteDialog.mediaId}
        onConfirm={async (itemId) => {
          if (itemId) {
            await handleDelete(itemId);
          }
        }}
        isLoading={isDeleting}
        title="Delete File"
        description={`Are you sure you want to delete "${deleteDialog.fileName}"? This action cannot be undone.`}
      />
    </>
  );
}

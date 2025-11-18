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
  File,
  X,
  Download,
  Trash2,
  FileText,
  Image,
  FileIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    <Card className="group hover:shadow-md transition-all duration-200 relative overflow-hidden">
      <CardContent className="p-0">
        {isImage ? (
          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 group/image">
            {imageError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Image className="h-12 w-12 text-gray-400" />
                <span className="text-xs text-gray-500">
                  Image not available
                </span>
              </div>
            ) : (
              <>
                <img
                  src={media.media_url}
                  alt={fileName}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover/image:opacity-100">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(media.media_url, "_blank");
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
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
          <div className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <FileIconComponent className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {fileName}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {fileTypeLabel}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {timestamp}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => window.open(media.media_url, "_blank")}
                >
                  <Download className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(media.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 50MB limit");
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Lead Media & Documents
            </DialogTitle>
            <DialogDescription>
              Upload and manage files for this lead
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Side - Upload Section */}
            <div className="w-1/2 border-r overflow-y-auto p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Upload Files
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Upload images, PDFs, and documents (Max 50MB per file)
                </p>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    const file = files[0];
                    // Create a data transfer object to simulate file input
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    if (fileInputRef.current) {
                      fileInputRef.current.files = dataTransfer.files;
                      const changeEvent = new Event("change", {
                        bubbles: true,
                      });
                      fileInputRef.current.dispatchEvent(changeEvent);
                    }
                  }
                }}
              >
                <div className="flex flex-col items-center justify-center gap-4">
                  {isUploading ? (
                    <>
                      <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Uploading...
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Please wait
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-4">
                        <Upload className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-center">
                        <Label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                            Click to upload or drag and drop
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Supported: PDF, DOC, DOCX, XLS, XLSX, Images
                          </p>
                        </Label>
                      </div>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                    disabled={isUploading}
                  />
                </div>
              </div>

              {mediaList.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Quick Stats
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {images.length}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Images
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {documents.length}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Documents
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-1/2 overflow-y-auto p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Uploaded Files ({mediaList.length})
                </h3>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : mediaList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
                    <FileIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    No files uploaded yet
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Upload files using the panel on the left
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {images.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Images ({images.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {images.map((media) => (
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
                    </div>
                  )}

                  {documents.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Documents ({documents.length})
                      </h4>
                      <div className="space-y-2">
                        {documents.map((media) => (
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
                    </div>
                  )}
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

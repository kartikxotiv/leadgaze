import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  File,
  Image,
  Video,
  FileText,
  Download,
  Calendar,
  User,
} from "lucide-react";
import { formatDateTimeWithTime } from "@/lib/utils/sales-lead-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface LeadMedia {
  id: string;
  lead_id: string;
  media_url: string;
  media_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchMediaFiles(leadId: string) {
  const response = await fetch(`/api/lead-media?leadId=${leadId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch media files");
  }
  const data = await response.json();
  return data.success ? data.data.media : [];
}

function getMediaIcon(mediaType: string) {
  if (mediaType.startsWith("image/")) return Image;
  if (mediaType.startsWith("video/")) return Video;
  return FileText;
}

function getMediaTypeLabel(mediaType: string) {
  if (mediaType.startsWith("image/")) return "Image";
  if (mediaType.startsWith("video/")) return "Video";
  if (mediaType.startsWith("application/pdf")) return "PDF";
  return "File";
}

interface AllFilesProps {
  leadId?: string;
}

export default function AllFiles({ leadId }: AllFilesProps) {
  const {
    data: mediaFiles,
    isLoading,
    isError,
  } = useQuery<LeadMedia[]>({
    queryKey: ["lead-media", leadId],
    queryFn: () => fetchMediaFiles(leadId!),
    enabled: !!leadId,
  });

  if (!leadId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No lead ID provided
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-red-500">Failed to load media files</div>
    );
  }

  if (!mediaFiles || mediaFiles.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No files uploaded</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {mediaFiles.map((file) => {
        const MediaIcon = getMediaIcon(file.media_type);
        const isImage = file.media_type.startsWith("image/");

        return (
          <div
            key={file.id}
            className="border border-[#c9c9c9] rounded-[3px] p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {isImage ? (
                <img
                  src={file.media_url}
                  alt={file.media_type}
                  className="h-16 w-16 object-cover rounded border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded border flex items-center justify-center">
                  <MediaIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MediaIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">
                      {getMediaTypeLabel(file.media_type)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => window.open(file.media_url, "_blank")}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    <span className="text-xs">Download</span>
                  </Button>
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">
                  {file.media_url}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDateTimeWithTime(file.created_at)}</span>
                  </div>
                  {file.created_by && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>Uploaded by user</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

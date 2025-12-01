"use client";

import { useState } from "react";
import { Image, FileIcon, Eye, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "./utils/format-timestamp";

export interface LeadMedia {
  id: string;
  lead_id: string;
  media_url: string;
  media_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaCardProps {
  media: LeadMedia;
  onDelete: (mediaId: string) => void;
  isDeleting?: boolean;
}

export function MediaCard({ media, onDelete, isDeleting }: MediaCardProps) {
  const [imageError, setImageError] = useState(false);
  const timestamp = formatTimestamp(media.created_at);
  const fileName = media.media_url.split("/").pop() || "file";
  const isImage = media.media_type.startsWith("image/");

  return (
    <Card className="group hover:shadow-md transition-all duration-200 overflow-hidden">
      {isImage ? (
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
          {imageError ? (
            <CardContent className="p-4 h-full flex flex-col items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center mb-2">
                <Image className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Image not available
              </span>
            </CardContent>
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
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="truncate block">{fileName}</span>
                <span className="text-gray-300">{timestamp}</span>
              </div>
            </>
          )}
        </div>
      ) : (
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
              <FileIcon className="h-5 w-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {fileName}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {timestamp}
                  </span>
                </div>
                <div
                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(media.media_url, "_blank");
                    }}
                  >
                    <Eye className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(media.id);
                    }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

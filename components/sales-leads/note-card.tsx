"use client";

import { FileText, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "./utils/format-timestamp";
import type { Note } from "@/hooks/use-notes";

export interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  isDeleting?: boolean;
}

export function NoteCard({
  note,
  onEdit,
  onDelete,
  isDeleting,
}: NoteCardProps) {
  const timestamp = formatTimestamp(note.createdAt);

  return (
    <Card
      className="group hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onEdit(note)}
    >
      <CardContent className="p-2">
        <div className="flex gap-3">
          <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <FileText className="!h-3 !w-3 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[13px] text-gray-900 dark:text-gray-100 truncate">
                  {note.title}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {timestamp}
                </span>
              </div>
              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 relative z-20 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onEdit(note);
                  }}
                >
                  <Edit className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 relative z-20 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onDelete(note.id);
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                </Button>
              </div>
            </div>

            <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed line-clamp-3">
              {note.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

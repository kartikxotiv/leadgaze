import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, Calendar, User } from "lucide-react";
import { formatDateTimeWithTime } from "@/lib/utils/sales-lead-utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Note {
  id: string;
  title: string;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchNotes(leadId: string) {
  const response = await fetch(`/api/notes?leadId=${leadId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch notes");
  }
  const data = await response.json();
  return data.success ? data.data.notes : [];
}

interface AllNotesProps {
  leadId?: string;
}

export default function AllNotes({ leadId }: AllNotesProps) {
  const {
    data: notes,
    isLoading,
    isError,
  } = useQuery<Note[]>({
    queryKey: ["notes", leadId],
    queryFn: () => fetchNotes(leadId!),
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
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="p-4 text-sm text-red-500">Failed to load notes</div>;
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No notes found</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {notes.map((note) => (
        <div
          key={note.id}
          className="border border-[#c9c9c9] rounded-[3px] p-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-sm text-gray-900">
              {note.title}
            </h4>
          </div>
          <p className="text-xs text-gray-600 mb-3 whitespace-pre-wrap">
            {note.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDateTimeWithTime(note.created_at)}</span>
            </div>
            {note.created_by && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>Created by user</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

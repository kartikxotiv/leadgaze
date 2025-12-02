import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Calendar,
  Clock,
  Link as LinkIcon,
  User,
  FileText,
  Plus,
} from "lucide-react";
import {
  formatDateTime,
  formatDateTimeWithTime,
} from "@/lib/utils/sales-lead-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MeetingDialog } from "@/components/meetings/meeting-dialog";

interface Meeting {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  meeting_notes: string | null;
  time: string;
  link: string | null;
  type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchMeetings(leadId: string) {
  const response = await fetch(`/api/meetings?leadId=${leadId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch meetings");
  }
  const data = await response.json();
  return data.success ? data.data.meetings : [];
}

interface AllMeetingProps {
  leadId?: string;
}

export default function AllMeeting({ leadId }: AllMeetingProps) {
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);

  const {
    data: meetings,
    isLoading,
    isError,
    refetch,
  } = useQuery<Meeting[]>({
    queryKey: ["meetings", leadId],
    queryFn: () => fetchMeetings(leadId!),
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
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-red-500">Failed to load meetings</div>
    );
  }

  return (
    <>
      <div className="p-2 flex justify-between items-center border-b border-[#e1ecfe] mb-2">
        <div className="font-semibold text-[13px] flex gap-2 items-center">
          <Calendar className="w-3 h-3 text-[#2563eb]" />
          Meetings {meetings && meetings.length > 0 && `(${meetings.length})`}
        </div>
        <button
          onClick={() => setIsMeetingDialogOpen(true)}
          className="border-[#2563eb] flex items-center gap-1 text-[#2563eb] text-xs px-3 rounded-[4px] py-2 border hover:bg-[#2563eb] hover:text-white transition"
        >
          Create Meeting
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {!meetings || meetings.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No meetings scheduled</p>
          </div>
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="border rounded-[3px] p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-gray-900 mb-1">
                    {meeting.title}
                  </h4>
                  {meeting.type && (
                    <Badge variant="outline" className="text-xs px-0">
                      {meeting.type}fff
                    </Badge>
                  )}
                </div>
              </div>

              {meeting.description && (
                <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">
                  {meeting.description}
                </p>
              )}

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <Clock className="h-3 w-3 text-gray-500" />
                  <span className="font-medium">
                    {formatDateTime(meeting.time)}
                  </span>
                </div>

                {meeting.link && (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-3 w-3 text-gray-500" />
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-blue-600"
                      onClick={() => window.open(meeting.link!, "_blank")}
                    >
                      Join Meeting
                    </Button>
                  </div>
                )}

                {meeting.meeting_notes && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                    <div className="flex items-center gap-1 mb-1 text-gray-600">
                      <FileText className="h-3 w-3" />
                      <span className="font-medium">Meeting Notes:</span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {meeting.meeting_notes}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Created {formatDateTime(meeting.created_at)}</span>
                </div>
                {meeting.created_by && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Created by user</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Meeting Dialog for creating/editing meetings */}
      {leadId && (
        <MeetingDialog
          open={isMeetingDialogOpen}
          onOpenChange={setIsMeetingDialogOpen}
          leadId={leadId}
          onSuccess={() => {
            void refetch();
          }}
        />
      )}
    </>
  );
}

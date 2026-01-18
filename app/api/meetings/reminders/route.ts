import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { emailService } from "@/lib/email-service";

export async function GET() {
  try {
    const now = new Date();
    const fiveMinutesFromNowStart = new Date(now.getTime() + 4 * 60000);
    const fiveMinutesFromNowEnd = new Date(now.getTime() + 6 * 60000);

    // Query meetings starting in approximately 5 minutes
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select(`
        id,
        title,
        time,
        link,
        lead_id,
        leads:lead_id(first_name, last_name),
        assignees:meetings_assignees(
          user:user_id(
            user_id,
            email,
            first_name,
            last_name
          )
        )
      `)
      .gte("time", fiveMinutesFromNowStart.toISOString())
      .lte("time", fiveMinutesFromNowEnd.toISOString())
      .or("status.eq.Pending,status.eq.Scheduled,status.eq.scheduled,status.is.null");

    if (meetingsError) {
      console.error("Error fetching upcoming meetings:", meetingsError);
      return NextResponse.json({ success: false, error: meetingsError.message }, { status: 500 });
    }

    if (!meetings || meetings.length === 0) {
      return NextResponse.json({ success: true, message: "No meetings starting in 5 minutes." });
    }

    const emailPromises = [];

    for (const meeting of meetings) {
      const leadName = meeting.leads 
        ? `${(meeting.leads as any).first_name || ""} ${(meeting.leads as any).last_name || ""}`.trim() 
        : "N/A";

      if (meeting.assignees && Array.isArray(meeting.assignees)) {
        for (const assigneeWrapper of meeting.assignees) {
          const user = (assigneeWrapper as any).user;
          if (user && user.email) {
            emailPromises.push(
              emailService.sendMeetingReminder({
                to: user.email,
                meetingTitle: meeting.title,
                meetingTime: meeting.time,
                meetingLink: meeting.link,
                assignedUserName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email,
                leadName: leadName !== "N/A" ? leadName : null,
              })
            );
          }
        }
      }
    }

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(Boolean).length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} reminders for ${meetings.length} meetings.`,
      meetingsProcessed: meetings.length,
      emailsSent: successCount
    });

  } catch (error: any) {
    console.error("Error in meeting reminder API:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

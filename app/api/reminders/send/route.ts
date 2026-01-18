import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import { emailService } from "@/lib/email-service";

export async function GET() {
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60_000);
    const windowEnd = new Date(now.getTime() + 60_000);

    const { data: reminders, error: remindersError } = await supabase
      .from("reminders")
      .select(
        `
        id,
        content,
        remind_at,
        lead_id,
        created_by,
        leads:lead_id(first_name, last_name),
        user:created_by(
          user_id,
          email,
          first_name,
          last_name
        )
      `,
      )
      .gte("remind_at", windowStart.toISOString())
      .lte("remind_at", windowEnd.toISOString());

    console.log({ reminders, remindersError });
    if (remindersError) {
      return NextResponse.json(
        { success: false, error: remindersError.message },
        { status: 500 },
      );
    }

    if (!reminders || reminders.length === 0) {
      console.log("No reminders due in the current window.");
      return NextResponse.json({
        success: true,
        message: "No reminders due this minute.",
        remindersProcessed: 0,
        emailsSent: 0,
      });
    }

    console.log(`Found ${reminders.length} reminders to process.`);

    const emailPromises: Promise<boolean>[] = [];

    for (const reminder of reminders as any[]) {
      const user = reminder.user;
      console.log({ user });
      const toEmail = user?.email;
      if (!toEmail) {
        console.warn(`No email found for user in reminder ${reminder.id}`);
        continue;
      }
      const recipientName =
        `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || toEmail;
      const lead = reminder.leads;
      const leadName =
        lead && (lead.first_name || lead.last_name)
          ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
          : null;

      console.log(
        `Queueing email for ${toEmail} (Reminder ID: ${reminder.id})`,
      );
      emailPromises.push(
        emailService.sendReminderEmail({
          to: toEmail,
          content: reminder.content,
          remindAt: reminder.remind_at,
          recipientName,
          leadName,
        }),
      );
    }

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(Boolean).length;
    console.log(
      `Successfully sent ${successCount}/${emailPromises.length} emails.`,
    );

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} reminder emails for ${reminders.length} due reminders.`,
      remindersProcessed: reminders.length,
      emailsSent: successCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 },
    );
  }
}

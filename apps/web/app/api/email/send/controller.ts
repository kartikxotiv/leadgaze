import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "~/lib/email/mailer";
import { catchAsync } from "~/utils/response-handler";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export const sendEmail = catchAsync(async ({ request }: { request: NextRequest }) => {
    try {
        const payload = await request.json();
        const supabase = getSupabaseServerClient();

        const {
            leadId,
            cc,
            bcc,
            subject,
            body,
            // reply_to_message_id
        } = payload;


        if (!leadId) {
            return NextResponse.json({ error: "Missing lead_id" }, { status: 400 });
        }


        // FETCH LEAD
        const { data: lead, error: leadError } = await (
            supabase.from('crm_leads').select() as any
        )
            .eq('id', leadId)
            .eq('is_deleted', false)
            .single();

        if (!lead) {
            return NextResponse.json({ error: "Lead not found" }, { status: 404 });
        }

        if (leadError) {
            return NextResponse.json(
                { error: leadError.message },
                { status: 500 }
            );
        }

        if (!lead.email) {
            return NextResponse.json({ error: "Lead email not found" }, { status: 404 });
        }

        const { data: account, error: accountError } = await supabase
            .from("email_accounts")
            .select("*")
            .eq("workspace_id", lead.workspace_id)
            .single();

        if (accountError) {
            return NextResponse.json({ error: "Email account error" }, { status: 500 });
        }

        if (!account) {
            return NextResponse.json({ error: "Email account not found" }, { status: 404 });
        }


        /* ---------------- SEND EMAIL ---------------- */
        const info = await sendMail({
            account,
            from: account?.email,
            to: lead.email,
            cc,
            bcc,
            subject,
            html: body,
            // headers: reply_to_message_id
            //     ? {
            //         "In-Reply-To": reply_to_message_id,
            //         "References": reply_to_message_id
            //     }
            //     : undefined
        });

        return NextResponse.json({
            success: true,
            messageId: info?.messageId
        });
    } catch (err: any) {
        console.log(err);

        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
})

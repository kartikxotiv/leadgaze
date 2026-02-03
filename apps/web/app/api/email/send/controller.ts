import { NextRequest, NextResponse } from "next/server";
import { renderTemplate, validateTemplateVars } from "~/lib/email/template";
import { sendMail } from "~/lib/email/mailer";
import { catchAsync } from "~/utils/response-handler";
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export const sendEmail = catchAsync(async ({ request }: { request: NextRequest }) => {
    try {
        const payload = await request.json();
        const supabase = getSupabaseServerClient();

        const {
            provider,               // "smtp" | "gmail_oauth"
            smtp_account_id,        // required if smtp
            oauth_account_id,       // required if gmail_oauth
            template_slug,
            to,
            from,
            dynamic_data,
            reply_to_message_id
        } = payload;

        /* ---------------- TEMPLATE ---------------- */
        const { data: template } = await supabase
            .from("email_templates")
            .select("*")
            .eq("slug", template_slug)
            .single();

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        validateTemplateVars(template.variables || [], dynamic_data);

        const html = renderTemplate(template.html_body, dynamic_data);
        const text = template.text_body
            ? renderTemplate(template.text_body, dynamic_data)
            : "";

        /* ---------------- PROVIDER CONFIG ---------------- */
        let providerConfig: any = {};

        if (provider === "smtp") {
            const { data: smtp } = await supabase
                .from("email_smtp_accounts")
                .select("*")
                .eq("id", smtp_account_id)
                .single();

            if (!smtp) {
                return NextResponse.json({ error: "SMTP account not found" }, { status: 404 });
            }

            providerConfig.smtp = smtp;
        }

        if (provider === "gmail_oauth") {
            const { data: oauth } = await supabase
                .from("email_oauth_accounts")
                .select("*")
                .eq("id", oauth_account_id)
                .single();

            providerConfig.oauth = oauth;
        }

        /* ---------------- SEND ---------------- */
        const info = await sendMail({
            provider,
            from,
            to,
            subject: template.subject,
            html,
            text,
            headers: reply_to_message_id
                ? {
                    "In-Reply-To": reply_to_message_id,
                    "References": reply_to_message_id
                }
                : undefined,
            ...providerConfig
        });

        /* ---------------- LOG ---------------- */
        await supabase.from("email_sends").insert({
            template_id: template.id,
            to_email: to,
            from_email: from,
            subject: template.subject,
            provider_message_id: info.messageId,
            status: "sent"
        });

        return NextResponse.json({
            success: true,
            messageId: info.messageId
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
})

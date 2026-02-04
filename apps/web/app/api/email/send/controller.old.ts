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
            workspace_id,           // required
            account_id,             // unified account id
            template_slug,
            to,
            from,
            dynamic_data,
            reply_to_message_id
        } = payload;

        if (!workspace_id) {
            return NextResponse.json({ error: "Missing workspace_id" }, { status: 400 });
        }

        /* ---------------- TEMPLATE ---------------- */
        const { data: template } = await supabase
            .from("workspace_email_templates")
            .select("*")
            .eq("workspace_id", workspace_id)
            .eq("slug", template_slug)
            .single();

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        const vars = (dynamic_data || {}) as Record<string, any>;
        validateTemplateVars(vars, (template.variables as unknown as string[]) || []);

        const html = renderTemplate(template.html_body, vars);
        const text = template.text_body
            ? renderTemplate(template.text_body, vars)
            : "";

        /* ---------------- ACCOUNT ---------------- */
        const { data: account } = await supabase
            .from("email_accounts")
            .select("*")
            .eq("workspace_id", workspace_id)
            .eq("id", account_id)
            .single();

        if (!account) {
            return NextResponse.json({ error: "Email account not found" }, { status: 404 });
        }

        /* ---------------- SEND ---------------- */
        /* ---------------- SEND ---------------- */
        const info = await sendMail({
            account,
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
                : undefined
        });

        /* ---------------- LOG ---------------- */
        /* ---------------- LOG ---------------- */
        await supabase.from("email_sends").insert({
            workspace_id,
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

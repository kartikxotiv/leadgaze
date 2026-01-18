export function renderInviteEmail(params: {
  organizationName: string;
  roleDisplay: string;
  inviterName: string;
  inviteUrl: string;
  message?: string;
  expiryDays?: number;
}) {
  const {
    organizationName,
    roleDisplay,
    inviterName,
    inviteUrl,
    message,
    expiryDays = 7,
  } = params;

  const subject = `You've been invited to join ${organizationName} on Leadgaze CRM`;
  const preview = `${inviterName} invited you as ${roleDisplay}. Finish setup to get started.`;

  const text = [
    subject,
    "",
    `${inviterName} invited you to ${organizationName} as ${roleDisplay}.`,
    message ? `\nMessage from ${inviterName}: ${message}\n` : "",
    `Accept your invitation: ${inviteUrl}`,
    `This link expires in ${expiryDays} days.`,
    "",
    "If you didn’t expect this email, you can ignore it.",
    "— Leadgaze CRM",
  ].join("\n");

  const html = `
  <!doctype html>
  <html lang="en">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${subject}</title>
    <style>
      body{margin:0;padding:0;background:#0f172a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif}
      .wrap{max-width:560px;margin:0 auto;padding:32px}
      .card{background:#0b1220;border:1px solid #1f2a44;border-radius:14px;overflow:hidden}
      .hdr{padding:24px 24px 0 24px}
      .logo{display:inline-flex;align-items:center;gap:10px;color:#60a5fa}
      .title{font-size:22px;font-weight:700;margin:16px 0 0}
      .body{padding:16px 24px 24px 24px;line-height:1.55}
      .muted{color:#94a3b8}
      .cta{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600}
      .pill{display:inline-block;padding:4px 10px;border-radius:999px;background:#1e293b;color:#cbd5e1;font-size:12px;margin-left:6px}
      .msg{margin:12px 0;padding:12px 14px;background:#0a1220;border:1px solid #1f2a44;border-radius:10px;color:#cbd5e1}
      .foot{padding:0 24px 24px 24px;color:#64748b;font-size:12px}
      @media (prefers-color-scheme: light){
        body{background:#f6f8fc;color:#0f172a}
        .card{background:#fff;border-color:#e5e7eb}
        .muted{color:#475569}
        .msg{background:#f9fafb;border-color:#e5e7eb;color:#334155}
        .foot{color:#64748b}
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="hdr">
          <div class="logo"><span>🚀</span><strong>Leadgaze CRM</strong></div>
          <h1 class="title">Invite to ${organizationName} <span class="pill">${roleDisplay}</span></h1>
        </div>
        <div class="body">
          <p><strong>${inviterName}</strong> invited you to join <strong>${organizationName}</strong> as <strong>${roleDisplay}</strong>.</p>
          ${
            message
              ? `<div class="msg"><strong>Message from ${inviterName}:</strong><br/>${escapeHtml(
                  message
                )}</div>`
              : ""
          }
          <p><a class="cta" href="${inviteUrl}" target="_blank" rel="noopener">Accept invitation</a></p>
          <p class="muted">This link expires in ${expiryDays} days. If you didn’t expect this email, you can safely ignore it.</p>
        </div>
        <div class="foot">© ${new Date().getFullYear()} Leadgaze CRM • Secure invitation</div>
      </div>
    </div>
  </body>
  </html>`.trim();

  return { subject, preview, html, text };
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
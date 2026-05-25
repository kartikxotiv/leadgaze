const INVITE_MEMBER_TEMPLATE = ({
  inviteLink,
  workspaceName,
  inviterName,
  productName,
  appUrl = 'https://app.leadgaze.com',
}: {
  inviteLink: string;
  workspaceName: string;
  inviterName: string;
  productName: string;
  appUrl?: string;
}) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invite to join ${productName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="width: 100%; background-color: #f8f9fc; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);">
      <!-- Header with Logo -->
      <div style="background-color: #ffffff; padding: 32px 24px; text-align: center; border-bottom: 4px solid #4eacff;">
        <img src="https://app.leadgaze.com/_next/image?url=%2Fimages%2Fleadgaze.png&w=640&q=75" alt="${productName}" style="height: 42px; margin-bottom: 18px; display: inline-block;" />
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
          You're invited to join
        </h1>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #4eacff;">${workspaceName}</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 32px 24px;">
        <!-- Inviter Info -->
        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #424242;">
          <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on <strong>${productName}</strong>. Accept the invitation to start collaborating with your team.
        </p>

        <!-- Workspace Card -->
        <div style="background-color: #f8f9fc; border: 1px solid #e0e7ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4eacff;">Workspace</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${workspaceName}</p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 0 0 24px 0;">
          <a href="${inviteLink}" style="display: inline-block; background-color: #4eacff; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(78, 172, 255, 0.3);">
            Accept Invite
          </a>
        </div>

        <!-- Helper Text -->
        <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #666666; text-align: center;">
          If you were not expecting this invitation, you can safely ignore this email or contact your administrator.
        </p>

        <!-- Footer Info Box -->
        <div style="background-color: #f0f4ff; border-left: 4px solid #4eacff; padding: 14px; border-radius: 4px;">
          <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #424242;">
            This invitation will expire in 7 days. For security, never share your invitation link with others. If you have any questions, contact your team administrator.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8f9fc; padding: 20px 24px; text-align: center; border-top: 1px solid #e0e7ff;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #999999;">
          © ${new Date().getFullYear()} ${productName}. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 12px; color: #999999;">
          <a href="${appUrl}" style="color: #4eacff; text-decoration: none;">Visit ${productName}</a> | 
          <a href="${appUrl}/help" style="color: #4eacff; text-decoration: none; margin-left: 12px;">Help Center</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export default INVITE_MEMBER_TEMPLATE;

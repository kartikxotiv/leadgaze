const ACCOUNT_ASSIGNMENT_EMAIL_TEMPLATE = ({
  accountName,
  accountWebsite,
  assignerName,
  accountUrl,
  productName = 'Leadgaze',
  appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
}: {
  accountName: string;
  accountWebsite?: string | null;
  assignerName?: string | null;
  accountUrl: string;
  productName?: string;
  appUrl?: string;
}) => {
  const operatorName = 'Xotiv Technologies Pvt. Ltd.';
  const operatorUrl = 'https://xotiv.com';

  const logoUrl =
    !appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1')
      ? 'https://app.leadgaze.com/images/lead-gaze-logo-main-screen.png'
      : `${appUrl}/images/lead-gaze-logo-main-screen.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You have been assigned an Account - ${productName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="width: 100%; background-color: #f8f9fc; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);">
      <!-- Header with Logo -->
      <div style="background-color: #ffffff; padding: 32px 24px; text-align: center; border-bottom: 4px solid #3953E7;">
        <img src="${logoUrl}" alt="${productName}" style="height: 42px; margin-bottom: 18px; display: inline-block;" />
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
          You have been assigned an Account
        </h1>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #3953E7;">${accountName}</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 32px 24px;">
        <!-- Assigner Info -->
        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #424242;">
          ${
            assignerName
              ? `<strong>${assignerName}</strong> has assigned you to manage the account <strong>${accountName}</strong> on <strong>${productName}</strong>.`
              : `You have been assigned to manage the account <strong>${accountName}</strong> on <strong>${productName}</strong>.`
          }
        </p>

        <!-- Account Details Card -->
        <div style="background-color: #f8f9fc; border: 1px solid #e0e7ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #3953E7;">Account Details</p>
          <p style="margin: 0 0 8px 0; font-size: 15px; color: #1a1a1a;"><strong>Account Name:</strong> ${accountName}</p>
          ${
            accountWebsite
              ? `<p style="margin: 0; font-size: 15px; color: #1a1a1a;"><strong>Website:</strong> ${accountWebsite}</p>`
              : ''
          }
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 0 0 24px 0;">
          <a href="${accountUrl}" style="display: inline-block; background-color: #3953E7; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(57, 83, 231, 0.3);">
            View Account
          </a>
        </div>

        <!-- Info Box -->
        <div style="background-color: #f0f4ff; border-left: 4px solid #3953E7; padding: 14px; border-radius: 4px;">
          <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #424242;">
            Please log in to your ${productName} workspace to view full activity logs, deals, or update account details.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8f9fc; padding: 20px 24px; text-align: center; border-top: 1px solid #e0e7ff;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #999999;">
          © ${new Date().getFullYear()} ${productName}. Operated by <a href="${operatorUrl}" target="_blank" rel="noopener noreferrer" style="color: #3953E7; text-decoration: none;">${operatorName}</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: #999999;">
          <a href="${appUrl}" style="color: #3953E7; text-decoration: none;">Visit ${productName}</a> | 
          <a href="${appUrl}/help" style="color: #3953E7; text-decoration: none; margin-left: 12px;">Help Center</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

export default ACCOUNT_ASSIGNMENT_EMAIL_TEMPLATE;

const EMPLOYEE_WELCOME_TEMPLATE = ({
  employeeName,
  loginUrl,
  productName,
  temporaryPassword,
  to,
  workspaceName,
}: {
  employeeName: string;
  loginUrl: string;
  productName: string;
  temporaryPassword: string;
  to: string;
  workspaceName: string;
}) => {
  const safeEmployeeName = escapeHtml(employeeName);
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeProductName = escapeHtml(productName);
  const safeTemporaryPassword = escapeHtml(temporaryPassword);
  const safeTo = escapeHtml(to);
  const safeWorkspaceName = escapeHtml(workspaceName);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to ${safeWorkspaceName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="width: 100%; background-color: #f8f9fc; padding: 32px 16px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);">
      <!-- Header with Logo -->
      <div style="background-color: #ffffff; padding: 32px 24px; text-align: center; border-bottom: 4px solid #4eacff;">
        <img src="https://app.leadgaze.com/_next/image?url=%2Fimages%2Fleadgaze.png&w=640&q=75" alt="${safeProductName}" style="height: 42px; margin-bottom: 18px; display: inline-block;" />
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
          Welcome to ${safeWorkspaceName}
        </h1>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #4eacff;">Your employee account is ready</p>
      </div>

      <!-- Main Content -->
      <div style="padding: 32px 24px;">
        <!-- Welcome Info -->
        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #424242;">
          Hi <strong>${safeEmployeeName}</strong>, your <strong>${safeWorkspaceName}</strong> employee account has been created on <strong>${safeProductName}</strong>. Use the credentials below to sign in.
        </p>

        <!-- Account Card -->
        <div style="background-color: #f8f9fc; border: 1px solid #e0e7ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4eacff;">Account Details</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #424242;"><strong style="color: #1a1a1a;">Email:</strong> ${safeTo}</p>
          <p style="margin: 0; font-size: 14px; color: #424242;"><strong style="color: #1a1a1a;">Password:</strong> ${safeTemporaryPassword}</p>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 0 0 24px 0;">
          <a href="${safeLoginUrl}" style="display: inline-block; background-color: #4eacff; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 15px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(78, 172, 255, 0.3);">
            Sign In
          </a>
        </div>

        <!-- Helper Text -->
        <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #666666; text-align: center;">
          Please sign in and change your password after your first login.
        </p>

        <!-- Footer Info Box -->
        <div style="background-color: #f0f4ff; border-left: 4px solid #4eacff; padding: 14px; border-radius: 4px;">
          <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #424242;">
            For security, never share your password with others. If you were not expecting this email, contact your administrator.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8f9fc; padding: 20px 24px; text-align: center; border-top: 1px solid #e0e7ff;">
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #999999;">
          &copy; ${new Date().getFullYear()} ${safeProductName}. All rights reserved.
        </p>
        <p style="margin: 0; font-size: 12px; color: #999999;">
          <a href="${safeLoginUrl}" style="color: #4eacff; text-decoration: none;">Visit ${safeProductName}</a>
        </p>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #999999;">
          A product by <a href="https://programea.com" target="_blank" rel="noopener noreferrer" style="color: #4eacff; text-decoration: none;">Programea LLC</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default EMPLOYEE_WELCOME_TEMPLATE;

const REMINDER_EMAIL_TEMPLATE = ({
  reminderTitle,
  reminderDescription,
  dueDate,
  productName,
}: {
  reminderTitle: string;
  reminderDescription?: string;
  dueDate: string;
  productName: string;
  billingCountry?: string;
}) => {
  const formattedDate = new Date(dueDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const operatorName = 'Xotiv Technologies Pvt. Ltd.';
  const operatorUrl = 'https://xotiv.com';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reminder: ${reminderTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: #3953E7; background: linear-gradient(135deg, #3953E7 0%, #283BA4 100%); padding: 32px 24px; text-align: center;">
      <p style="margin: 0; color: #000; font-size: 26px; font-weight: bold; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">📌 Reminder</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px 24px;">
      <p style="margin: 0 0 16px 0; color: #1a202c; font-size: 20px; font-weight: bold; line-height: 1.2;">${reminderTitle}</p>
      
      ${reminderDescription
      ? `<p style="margin: 0 0 24px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">${reminderDescription}</p>`
      : ''
    }
      
      <div style="background-color: #f7fafc; border-left: 4px solid #3953E7; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #283BA4; font-size: 14px; font-weight: 600;">⏰ Due Date</p>
        <p style="margin: 8px 0 0 0; color: #1a202c; font-size: 16px; font-weight: 500;">${formattedDate}</p>
      </div>
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 12px; line-height: 1.5;">
          This is an automated reminder from ${productName}. Please log in to your account to view or update this reminder.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f7fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #a0aec0; font-size: 12px;">
        © ${new Date().getFullYear()} ${productName}. Operated by <a href="${operatorUrl}" target="_blank" rel="noopener noreferrer" style="color: #3953E7; text-decoration: none;">${operatorName}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

export default REMINDER_EMAIL_TEMPLATE;

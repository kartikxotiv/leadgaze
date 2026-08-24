const MEETING_REMINDER_TEMPLATE = ({
  meetingTitle,
  meetingDescription,
  startTime,
  endTime,
  location,
  meetingLink,
  intervalLabel,
  productName,
  recipientTz = 'UTC',
}: {
  meetingTitle: string;
  meetingDescription?: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  intervalLabel: string;
  productName: string;
  billingCountry?: string;
  recipientTz?: string;
}) => {
  const formatDate = (dateString: string) => {
    try {
      return (
        new Date(dateString).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: recipientTz,
        }) + ` [${recipientTz}]`
      );
    } catch {
      return new Date(dateString).toLocaleString('en-US') + ' [UTC]';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return (
        new Date(dateString).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: recipientTz,
        }) + ` [${recipientTz}]`
      );
    } catch {
      return new Date(dateString).toLocaleTimeString('en-US') + ' [UTC]';
    }
  };

  const operatorName = 'Xotiv Technologies Pvt. Ltd.';
  const operatorUrl = 'https://xotiv.com';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Reminder: ${meetingTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: #3953E7; background: linear-gradient(135deg, #3953E7 0%, #283BA4 100%); padding: 32px 24px; text-align: center;">
      <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 8px 16px; border-radius: 20px; margin-bottom: 12px;">
        <span style="color: #000; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${intervalLabel}</span>
      </div>
      <p style="margin: 0; color: #000; font-size: 24px; font-weight: bold; line-height: 1.2;">📅 Meeting Reminder</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 32px 24px;">
      <p style="margin: 0 0 16px 0; color: #1a202c; font-size: 20px; font-weight: bold; line-height: 1.2;">${meetingTitle}</p>
      
      ${
        meetingDescription
          ? `<p style="margin: 0 0 24px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">${meetingDescription}</p>`
          : ''
      }
      
      <!-- Time Info -->
      <div style="background-color: #ebf8ff; border-left: 4px solid #3953E7; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;">
              <p style="margin: 0; color: #283BA4; font-size: 13px; font-weight: 600; text-transform: uppercase;">Start</p>
              <p style="margin: 4px 0 0 0; color: #1a202c; font-size: 16px; font-weight: 500;">${formatDate(startTime)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <p style="margin: 0; color: #283BA4; font-size: 13px; font-weight: 600; text-transform: uppercase;">End</p>
              <p style="margin: 4px 0 0 0; color: #1a202c; font-size: 16px; font-weight: 500;">${formatTime(endTime)}</p>
            </td>
          </tr>
        </table>
      </div>
      
      ${
        location
          ? `
      <div style="background-color: #f7fafc; padding: 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: #2d3748; font-size: 13px; font-weight: 600; text-transform: uppercase;">📍 Location</p>
        <p style="margin: 8px 0 0 0; color: #1a202c; font-size: 15px;">${location}</p>
      </div>
      `
          : ''
      }
      
      ${
        meetingLink
          ? `
      <div style="margin: 24px 0;">
        <a href="${meetingLink}" style="display: inline-block; background-color: #3953E7; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; text-align: center;">
          Join Meeting
        </a>
      </div>
      `
          : ''
      }
      
      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 12px; line-height: 1.5;">
          This is an automated meeting reminder from ${productName}. Please log in to your account to view or update this meeting.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f7fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #a0aec0; font-size: 12px;">
        © ${new Date().getFullYear()} ${productName}. Operated by <a href="${operatorUrl}" target="_blank" rel="noopener noreferrer" style="color: #4299e1; text-decoration: none;">${operatorName}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

export default MEETING_REMINDER_TEMPLATE;

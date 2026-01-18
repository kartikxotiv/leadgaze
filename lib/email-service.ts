import { transporter } from "./mail";
import { type Transporter } from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface PasswordResetEmailData {
  firstName: string;
  lastName: string;
  resetUrl: string;
  expiresInHours: number;
  organizationName?: string;
}

export interface OTPEmailData {
  email: string;
  otp: string;
  purpose: string;
  expiresInMinutes: number;
}

export interface MeetingReminderData {
  to: string;
  meetingTitle: string;
  meetingTime: string;
  meetingLink?: string | null;
  assignedUserName: string;
  leadName?: string | null;
}

export interface ReminderEmailData {
  to: string;
  content: string;
  remindAt: string;
  recipientName: string;
  leadName?: string | null;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  constructor() {}

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const fromEmail =
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER ||
      process.env.EMAIL_USER ||
      "noreply@yourcrm.com";
    const fromName = process.env.EMAIL_FROM_NAME || "CRM System";

    try {
      await new Promise((resolve, reject) => {
        transporter.sendMail(
          {
            from: `"${fromName}" <${fromEmail}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
          },
          (err, info) => {
            if (err) {
              console.error(`❌ Failed to send email to ${options.to}:`, err);
              reject(err);
            } else {
              resolve(info);
            }
          },
        );
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendRawEmail(options: EmailOptions): Promise<boolean> {
    return this.sendEmail(options);
  }

  async sendInvitationEmail(
    email: string,
    invitationData: {
      organizationName: string;
      roleDisplay: string;
      inviterName: string;
      inviteUrl: string;
      message?: string;
      expiryDays?: number;
    },
  ): Promise<boolean> {
    const subject = `You're invited to join ${invitationData.organizationName}`;

    const { renderInviteEmail } = await import("./emails/invite");
    const { html, text } = renderInviteEmail(invitationData);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  private generatePasswordResetHTML(data: PasswordResetEmailData): string {
    const { firstName, lastName, resetUrl, expiresInHours, organizationName } =
      data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .email-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #1a202c;
        }
        .message {
            font-size: 16px;
            margin-bottom: 30px;
            color: #4a5568;
        }
        .button {
            display: inline-block;
            background: #3182ce;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            text-align: center;
        }
        .button:hover {
            background: #2c5aa0;
        }
        .security-notice {
            background: #fff5f5;
            border-left: 4px solid #fed7d7;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .security-notice p {
            margin: 0;
            color: #742a2a;
            font-size: 14px;
        }
        .footer {
            background: #f7fafc;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
            color: #718096;
            border-top: 1px solid #e2e8f0;
        }
        .link-text {
            word-break: break-all;
            color: #3182ce;
            font-size: 14px;
            margin-top: 15px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 30px 20px;
            }
            .header {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
        <h1>CRM System</h1>
            <h1>🔐 Password Reset Request</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello ${firstName} ${lastName},
            </div>
            
            <div class="message">
                We received a request to reset your password for your ${
                  organizationName ? `${organizationName} ` : ""
                }CRM account. 
                If you didn't make this request, you can safely ignore this email.
            </div>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Your Password</a>
            </div>
            
            <div class="security-notice">
                <p><strong>🛡️ Security Notice:</strong></p>
                <p>• This link will expire in ${expiresInHours} hour${
                  expiresInHours !== 1 ? "s" : ""
                }</p>
                <p>• The link can only be used once</p>
                <p>• If you didn't request this reset, please ignore this email</p>
            </div>
            
            <div class="message">
                If the button above doesn't work, you can copy and paste this link into your browser:
            </div>
            
            <div class="link-text">
                ${resetUrl}
            </div>
        </div>
        
        <div class="footer">
            <p>This email was sent from your CRM system. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} CRM System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generatePasswordResetText(data: PasswordResetEmailData): string {
    const { firstName, lastName, resetUrl, expiresInHours, organizationName } =
      data;

    return `
Password Reset Request

Hello ${firstName} ${lastName},

We received a request to reset your password for your ${
      organizationName ? `${organizationName} ` : ""
    }CRM account.

To reset your password, click the following link:
${resetUrl}

Security Information:
- This link will expire in ${expiresInHours} hour${
      expiresInHours !== 1 ? "s" : ""
    }
- The link can only be used once
- If you didn't request this reset, please ignore this email

If you're having trouble clicking the link, copy and paste it into your browser.

This email was sent from your CRM system. Please do not reply to this email.

© ${new Date().getFullYear()} CRM System. All rights reserved.
`;
  }

  async sendPasswordResetEmail(
    email: string,
    resetData: PasswordResetEmailData,
  ): Promise<boolean> {
    const subject = `Reset Your Password - ${
      resetData.organizationName || "CRM System"
    }`;

    const html = this.generatePasswordResetHTML(resetData);
    const text = this.generatePasswordResetText(resetData);

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordChangedEmail(
    email: string,
    firstName: string,
    lastName: string,
    organizationName?: string,
  ): Promise<boolean> {
    const subject = `Password Changed Successfully - ${
      organizationName || "CRM System"
    }`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Changed</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #48bb78; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
        .success-icon { font-size: 24px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="success-icon">✅</div>
        <h1>Password Changed Successfully</h1>
    </div>
    <div class="content">
        <p>Hello ${firstName} ${lastName},</p>
        <p>Your password has been successfully changed for your ${
          organizationName ? `${organizationName} ` : ""
        }CRM account.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>Thank you for keeping your account secure!</p>
    </div>
</body>
</html>`;

    const text = `
Password Changed Successfully

Hello ${firstName} ${lastName},

Your password has been successfully changed for your ${
      organizationName ? `${organizationName} ` : ""
    }CRM account.

If you didn't make this change, please contact support immediately.

Thank you for keeping your account secure!
`;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  private generateOTPHTML(data: OTPEmailData): string {
    const { email, otp, purpose, expiresInMinutes } = data;

    const purposeTitle =
      {
        signup: "Email Verification",
        password_reset: "Password Reset",
        login: "Login Verification",
      }[purpose] || "Email Verification";

    const purposeMessage =
      {
        signup:
          "To complete your account registration, please verify your email address",
        password_reset:
          "To reset your password, please verify your email address",
        login: "To secure your login, please verify your email address",
      }[purpose] || "Please verify your email address";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${purposeTitle}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .email-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
            text-align: center;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #1a202c;
        }
        .message {
            font-size: 16px;
            margin-bottom: 30px;
            color: #4a5568;
        }
        .otp-container {
            background: #f0f8ff;
            border: 2px solid #3182ce;
            border-radius: 8px;
            padding: 30px;
            margin: 30px 0;
        }
        .otp-label {
            font-size: 14px;
            color: #4a5568;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #3182ce;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 0;
        }
        .expiry-notice {
            background: #fff5f5;
            border-left: 4px solid #fed7d7;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
            text-align: left;
        }
        .expiry-notice p {
            margin: 0;
            color: #742a2a;
            font-size: 14px;
        }
        .footer {
            background: #f7fafc;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
            color: #718096;
            border-top: 1px solid #e2e8f0;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .content {
                padding: 30px 20px;
            }
            .header {
                padding: 20px;
            }
            .otp-code {
                font-size: 28px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🔐 ${purposeTitle}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello,
            </div>
            
            <div class="message">
                ${purposeMessage} with the verification code below:
            </div>
            
            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
            </div>
            
            <div class="expiry-notice">
                <p><strong>Important:</strong> This code will expire in ${expiresInMinutes} minutes for your security.</p>
            </div>
            
            <div class="message">
                If you didn't request this verification, please ignore this email.
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Leadgaze CRM System.</p>
            <p>Sent to: ${email}</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateOTPText(data: OTPEmailData): string {
    const { email, otp, purpose, expiresInMinutes } = data;

    const purposeTitle =
      {
        signup: "Email Verification",
        password_reset: "Password Reset",
        login: "Login Verification",
      }[purpose] || "Email Verification";

    const purposeMessage =
      {
        signup:
          "To complete your account registration, please verify your email address",
        password_reset:
          "To reset your password, please verify your email address",
        login: "To secure your login, please verify your email address",
      }[purpose] || "Please verify your email address";

    return `
${purposeTitle}

Hello,

${purposeMessage} with the verification code below:

Your Verification Code: ${otp}

Important: This code will expire in ${expiresInMinutes} minutes for your security.

If you didn't request this verification, please ignore this email.

--
This is an automated message from Leadgaze CRM System.
Sent to: ${email}
`;
  }

  async sendOTPEmail(data: OTPEmailData): Promise<boolean> {
    const purposeTitle =
      {
        signup: "Email Verification Code",
        password_reset: "Password Reset Code",
        login: "Login Verification Code",
      }[data.purpose] || "Email Verification Code";

    const subject = `${purposeTitle} - ${data.otp}`;
    const html = this.generateOTPHTML(data);
    const text = this.generateOTPText(data);

    return this.sendEmail({
      to: data.email,
      subject,
      html,
      text,
    });
  }

  async sendMeetingReminder(data: MeetingReminderData): Promise<boolean> {
    const subject = `Reminder: ${data.meetingTitle} starts in 5 minutes`;
    const html = this.generateMeetingReminderHTML(data);
    const text = this.generateMeetingReminderText(data);

    return this.sendEmail({
      to: data.to,
      subject,
      html,
      text,
    });
  }

  async sendReminderEmail(data: ReminderEmailData): Promise<boolean> {
    const subject = `Reminder: ${data.content?.slice(0, 60) || "Due"}`.trim();
    const html = this.generateReminderEmailHTML(data);
    const text = this.generateReminderEmailText(data);
    return this.sendEmail({
      to: data.to,
      subject,
      html,
      text,
    });
  }

  private generateMeetingReminderHTML(data: MeetingReminderData): string {
    const {
      meetingTitle,
      meetingTime,
      meetingLink,
      assignedUserName,
      leadName,
    } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3182ce; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
        .info { margin-bottom: 10px; }
        .info strong { color: #2d3748; }
    </style>
</head>
<body>
    <div class="header">
        <h1>⏰ Meeting Starting Soon</h1>
    </div>
    <div class="content">
        <p>Hello ${assignedUserName},</p>
        <p>This is a reminder that your meeting is starting in 5 minutes.</p>
        
        <div class="info"><strong>Meeting:</strong> ${meetingTitle}</div>
        <div class="info"><strong>Time:</strong> ${new Date(
          meetingTime,
        ).toLocaleString()}</div>
        ${
          leadName
            ? `<div class="info"><strong>Lead:</strong> ${leadName}</div>`
            : ""
        }
        
        ${
          meetingLink
            ? `
        <div style="text-align: center;">
            <a href="${meetingLink}" class="button">Join Meeting</a>
        </div>
        `
            : ""
        }
        
        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
            If you're having trouble with the button, you can use the link below: <br>
            ${meetingLink || "No link provided"}
        </p>
    </div>
</body>
</html>`;
  }

  private generateMeetingReminderText(data: MeetingReminderData): string {
    const {
      meetingTitle,
      meetingTime,
      meetingLink,
      assignedUserName,
      leadName,
    } = data;
    return `
Meeting Reminder

Hello ${assignedUserName},

This is a reminder that your meeting is starting in 5 minutes.

Meeting: ${meetingTitle}
Time: ${new Date(meetingTime).toLocaleString()}
${leadName ? `Lead: ${leadName}` : ""}

Join Meeting: ${meetingLink || "No link provided"}

--
Sent from Leadgaze CRM System.
`;
  }

  private generateReminderEmailHTML(data: ReminderEmailData): string {
    const { content, remindAt, recipientName, leadName } = data;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
        .info { margin-bottom: 10px; }
        .info strong { color: #2d3748; }
        .box { background: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; }
    </style>
    </head>
<body>
    <div class="header">
        <h1>⏰ Reminder Due</h1>
    </div>
    <div class="content">
        <p>Hello ${recipientName},</p>
        <p class="info"><strong>Time:</strong> ${new Date(
          remindAt,
        ).toLocaleString()}</p>
        ${
          leadName
            ? `<p class="info"><strong>Lead:</strong> ${leadName}</p>`
            : ""
        }
        <div class="box">
            ${content}
        </div>
        <p style="margin-top: 30px; font-size: 14px; color: #718096;">
            This is an automated message from Leadgaze CRM System.
        </p>
    </div>
</body>
</html>`;
  }

  private generateReminderEmailText(data: ReminderEmailData): string {
    const { content, remindAt, recipientName, leadName } = data;
    return `
Reminder Due

Hello ${recipientName},

Time: ${new Date(remindAt).toLocaleString()}
${leadName ? `Lead: ${leadName}` : ""}

${content}

--
Sent from Leadgaze CRM System.
`;
  }

  async testEmailConfiguration(): Promise<boolean> {
    try {
      await transporter.verify();
      return true;
    } catch (error) {
      console.error("Email configuration test failed:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;

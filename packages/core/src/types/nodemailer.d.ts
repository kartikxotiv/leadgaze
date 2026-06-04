declare module 'nodemailer' {
  export type Transporter = {
    sendMail: (options: Record<string, unknown>) => Promise<{ messageId?: string }>;
  };

  export function createTransport(options: Record<string, unknown>): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
  port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT),
  secure: (process.env.SMTP_SECURE || process.env.EMAIL_SECURE) === "true",
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASS,
  },
});

export { transporter };

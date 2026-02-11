import nodemailer from "nodemailer";
import { decrypt } from "~/utils/crypto";

export async function sendSMTP({
    account,
    from,
    to,
    cc,
    bcc,
    subject,
    html,
    text,
    headers
}: any) {
    const transporter = nodemailer.createTransport({
        host: account.host,
        port: account.port,
        secure: account.secure,
        auth: account.username
            ? {
                user: account.username,
                pass: decrypt(account.password)
            }
            : undefined
    });

    return transporter.sendMail({
        from,
        to,
        cc,
        bcc,
        subject,
        html,
        text,
        headers
    });
}

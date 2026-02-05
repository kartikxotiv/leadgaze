import nodemailer from "nodemailer";

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
                pass: account.password
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

import nodemailer from "nodemailer";

export async function sendSMTP({
    smtp,
    from,
    to,
    subject,
    html,
    text,
    headers
}: any) {
    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.username
            ? {
                user: smtp.username,
                pass: smtp.password
            }
            : undefined
    });

    return transporter.sendMail({
        from,
        to,
        subject,
        html,
        text,
        headers
    });
}

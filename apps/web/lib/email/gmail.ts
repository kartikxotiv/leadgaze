import nodemailer from "nodemailer";
import { google } from "googleapis";

export async function sendGmailOAuth({
    from,
    to,
    cc,
    bcc,
    subject,
    html,
    text,
    headers,
    account
}: any) {
    if (!account.access_token || !account.refresh_token) {
        throw new Error("Missing OAuth tokens");
    }

    const client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    client.setCredentials({
        refresh_token: account.refresh_token,
        access_token: account.access_token
    });

    const { token } = await client.getAccessToken();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: from,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: account.refresh_token,
            accessToken: token!
        }
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

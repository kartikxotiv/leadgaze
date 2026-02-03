import nodemailer from "nodemailer";
import { google } from "googleapis";

export async function sendGmailOAuth({
    from,
    to,
    subject,
    html,
    text,
    headers,
    oauth
}: any) {
    const client = new google.auth.OAuth2(
        oauth.clientId,
        oauth.clientSecret
    );

    client.setCredentials({ refresh_token: oauth.refreshToken });

    const { token } = await client.getAccessToken();

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: from,
            clientId: oauth.clientId,
            clientSecret: oauth.clientSecret,
            refreshToken: oauth.refreshToken,
            accessToken: token!
        }
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

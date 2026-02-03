import { sendSMTP } from "./smtp";
import { sendGmailOAuth } from "./gmail";

export async function sendMail(options: any) {
    if (options.provider === "smtp") {
        return sendSMTP(options);
    }

    if (options.provider === "gmail_oauth") {
        return sendGmailOAuth(options);
    }

    throw new Error("Invalid mail provider");
}

import { NextRequest } from "next/server";
import { sendEmail } from "./controller";

export const POST = (request: NextRequest) => {
    return sendEmail({ request });
};

import { NextRequest } from "next/server";
import { submitSMTPDetails } from "./controller";

export const POST = (request: NextRequest) => {
    return submitSMTPDetails({ request });
};

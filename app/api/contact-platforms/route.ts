import { NextResponse, type NextRequest } from "next/server";
import {
  createContactPlatform,
  getContactPlatforms,
} from "@/lib/data/contact-platforms";

export async function GET() {
  try {
    const platforms = await getContactPlatforms();
    return NextResponse.json({ success: true, data: platforms });
  } catch (error: any) {
    console.error("Error fetching contact platforms:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch contact platforms",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body?.name?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Platform name is required" },
        { status: 400 }
      );
    }

    const platform = await createContactPlatform(name);

    return NextResponse.json({ success: true, data: platform });
  } catch (error: any) {
    console.error("Error creating contact platform:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to create contact platform",
      },
      { status: 500 }
    );
  }
}


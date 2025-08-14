import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { Lead, LeadConfig, User } from "@/models";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface IncomingLeadRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  businessName?: string;
  jobTitle?: string;
  source?: string;
  sourceId?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    let requesterUserId: string | undefined;
    try {
      const decoded: any = jwt.verify(authHeader.substring(7), JWT_SECRET);
      requesterUserId = decoded?.userId;
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const organizationId: string | undefined = body?.organizationId;
    const workspaceId: string | undefined = body?.workspaceId;
    const rows: IncomingLeadRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "organizationId is required" },
        { status: 400 }
      );
    }
    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: "rows must be a non-empty array" },
        { status: 400 }
      );
    }

    let successful = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: string[] = [];

    // Preload configs for mapping
    const activeSources = await LeadConfig.findAll({
      where: { entityType: "source" },
      attributes: ["id", "entityValue"],
    });

    const defaultStatus = await LeadConfig.findOne({
      where: { entityType: "status", entityValue: "new" },
      attributes: ["id"],
    });
    if (!defaultStatus) {
      return NextResponse.json(
        {
          success: false,
          error: "Default 'new' status not found in configuration",
        },
        { status: 500 }
      );
    }
    const defaultStatusId = (defaultStatus as any).id as string;

    const normalize = (s: string) => (s || "").trim().toLowerCase();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIdx = i + 1;

      const firstName = (row.firstName || "").trim();
      const lastName = (row.lastName || "").trim();
      const email = normalize(row.email || "");
      if (!firstName || !lastName || !email) {
        failed++;
        errors.push(
          `Row ${rowIdx}: Missing required fields (firstName/lastName/email)`
        );
        continue;
      }

      // Duplicate per organization by email
      const existing = await Lead.findOne({
        where: { email, organizationId },
        attributes: ["leadId"],
      });
      if (existing) {
        duplicates++;
        continue;
      }

      // Resolve source
      let sourceId: string | undefined = row.sourceId;
      if (!sourceId && row.source) {
        const match = activeSources.find(
          (s: any) =>
            normalize((s as any).entityValue) ===
            normalize(row.source as string)
        );
        sourceId = (match as any)?.id;
      }
      if (!sourceId) {
        // fallback to "unknown" if configured
        const unknown = activeSources.find(
          (s: any) => normalize((s as any).entityValue) === "unknown"
        );
        if (unknown) sourceId = (unknown as any).id;
      }
      if (!sourceId) {
        failed++;
        errors.push(`Row ${rowIdx}: Could not resolve source/sourceId`);
        continue;
      }

      try {
        await Lead.create({
          firstName,
          lastName,
          email,
          phone: row.phone || null,
          businessName: row.businessName || null,
          jobTitle: row.jobTitle || null,
          qualificationNotes: row.notes || null,
          organizationId,
          sourceId,
          statusId: defaultStatusId,
          createdBy: requesterUserId,
          metaData: workspaceId ? { workspaceId } : undefined,
          // Set default status via config if needed in model layer/route
        });
        successful++;
      } catch (e: any) {
        failed++;
        errors.push(`Row ${rowIdx}: ${e?.message || "create failed"}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { successful, failed, duplicates, errors: errors.slice(0, 50) },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import leads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

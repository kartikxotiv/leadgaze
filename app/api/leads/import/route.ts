import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createLead, findLeadByEmail } from "@/lib/data/leads";
import { getLeadConfigsByType, getLeadConfigByTypeAndValue } from "@/lib/data/lead-config";

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

    // Get active sources
    const activeSources = await getLeadConfigsByType("source");

    // Get default status
    const defaultStatus = await getLeadConfigByTypeAndValue("status", "new");
    if (!defaultStatus) {
      return NextResponse.json(
        {
          success: false,
          error: "Default 'new' status not found in configuration",
        },
        { status: 500 }
      );
    }
    const defaultStatusId = defaultStatus.id;

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

      // Check for existing lead
      const existing = await findLeadByEmail(email, organizationId);
      if (existing) {
        duplicates++;
        continue;
      }

     
      let sourceId: string | undefined = row.sourceId;
      if (!sourceId && row.source) {
        console.log(`Looking for source: "${row.source}"`);
        console.log(`Available sources:`, activeSources.map((s) => s.entity_value));
        
        // Try to find exact match first
        const match = activeSources.find(
          (s) => normalize(s.entity_value) === normalize(row.source as string)
        );
        sourceId = match?.id;
        console.log(`Found match:`, sourceId);
        
        // If no exact match, try common mappings
        if (!sourceId) {
          const sourceValue = normalize(row.source as string);
          const mappedSources: Record<string, string[]> = {
            website: ['website', 'web', 'online'],
            referral: ['referral', 'refer'],
            linkedin: ['linkedin', 'linked in'],
            cold_call: ['coldcall', 'cold call', 'coldcall'],
            email: ['email', 'mail'],
            trade_show: ['tradeshow', 'trade show', 'tradeshow'],
            advertisement: ['advertisement', 'ad', 'advert'],
            unknown: ['unknown', 'other', 'na'],
          };
          
          for (const [key, variations] of Object.entries(mappedSources)) {
            if (variations.includes(sourceValue)) {
              const mappedMatch = activeSources.find(
                (s) => normalize(s.entity_value) === key
              );
              if (mappedMatch) {
                sourceId = mappedMatch.id;
                break;
              }
            }
          }
        }
      }
      
      // If still no sourceId, try to find "unknown" source
      if (!sourceId) {
        const unknown = activeSources.find(
          (s) => normalize(s.entity_value) === "unknown"
        );
        if (unknown) sourceId = unknown.id;
      }
      
      // If still no sourceId, try to find the first available source
      if (!sourceId && activeSources.length > 0) {
        sourceId = activeSources[0].id;
      }
      
      if (!sourceId) {
        failed++;
        errors.push(`Row ${rowIdx}: Could not resolve source/sourceId`);
        continue;
      }

      try {
        await createLead({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: row.phone || undefined,
          business_name: row.businessName || undefined,
          job_title: row.jobTitle || undefined,
          qualification_notes: row.notes || undefined,
          organization_id: organizationId,
          source_id: sourceId,
          status_id: defaultStatusId,
          created_by: requesterUserId!,
          lead_score: 0,
          meta_data: workspaceId ? { workspaceId } : undefined,
          tags: undefined,
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

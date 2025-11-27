import { NextRequest, NextResponse } from "next/server";
import { createSalesLead, checkEmailExists } from "@/lib/data/sales-leads";
import {
  getContactPlatforms,
  createContactPlatform,
} from "@/lib/data/contact-platforms";
import { getLeadPriorities } from "@/lib/data/lead-priorities";
import { verifyAuth } from "@/lib/rbac/api-helpers";

interface IncomingLeadRow {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  location?: string;
  alternativeEmail?: string;
  alternativePhoneNumber?: string;
  businessContact?: string;
  businessLinkedin?: string;
  businessName?: string;
  comment?: string;
  linkedinUrl?: string;
  platform?: string; // Platform name (not ID)
  status?: "pipeline" | "in_progress" | "won" | "lost";
  priority?: string; // Priority name (not ID)
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { userId: requesterUserId } = authResult;

    const body = await request.json();
    const workspaceId: string | undefined = body?.workspaceId;
    const rows: IncomingLeadRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
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

    // Get all contact platforms for name matching
    const platforms = await getContactPlatforms();
    const platformMap = new Map<string, number>();
    platforms.forEach((p) => {
      if (p.id !== undefined && p.id !== null && p.name) {
        platformMap.set(p.name.toLowerCase().trim(), p.id);
      }
    });

    // Get all priorities for name matching
    const priorities = await getLeadPriorities();
    const priorityMap = new Map<string, string>();
    priorities.forEach((p) => {
      if (p.id && p.name) {
        priorityMap.set(p.name.toLowerCase().trim(), p.id);
      }
    });

    const normalize = (s: string) => (s || "").trim().toLowerCase();

    // Helper function to safely convert to string and trim
    const safeStringTrim = (value: any): string | null => {
      if (value === null || value === undefined) return null;
      const str = String(value).trim();
      return str || null;
    };

    function normalizePhoneNumber(
      value?: string | number | null
    ): number | null {
      if (!value) return null;
      const strValue = String(value);
      const digits = strValue.replace(/\D/g, "");
      if (!digits) return null;
      const parsed = Number(digits);
      if (Number.isNaN(parsed)) return null;
      const INT32_MAX = 2_147_483_647;
      if (parsed > INT32_MAX || parsed < 0) return null;
      return parsed;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIdx = i + 1;

      const firstName = safeStringTrim(row.firstName) || "";
      const lastName = safeStringTrim(row.lastName) || "";
      const email = normalize(String(row.email || ""));
      const phoneNumber = safeStringTrim(row.phoneNumber);

      // Validation
      if (!firstName || !lastName || !email) {
        failed++;
        errors.push(
          `Row ${rowIdx}: Missing required fields (firstName/lastName/email)`
        );
        continue;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        failed++;
        errors.push(`Row ${rowIdx}: Invalid email format`);
        continue;
      }

      // Phone validation - non-blocking
      if (phoneNumber) {
        const digits = phoneNumber.replace(/\D/g, "");
        if (digits.length > 0 && digits.length !== 10) {
          errors.push(
            `Row ${rowIdx}: Phone number has ${digits.length} digits (expected 10), will be stored as-is`
          );
        }
      }

      // Check for duplicate email in workspace
      const emailExists = await checkEmailExists(email, workspaceId);
      if (emailExists) {
        duplicates++;
        continue;
      }

      // Resolve platform
      let platformId: number | null = null;
      if (row.platform) {
        const platformName = normalize(String(row.platform || ""));
        platformId = platformMap.get(platformName) || null;

        if (!platformId && platformName) {
          try {
            const newPlatform = await createContactPlatform(
              safeStringTrim(row.platform) || ""
            );
            if (newPlatform.id !== undefined && newPlatform.id !== null) {
              platformId = newPlatform.id;
              platformMap.set(platformName, platformId);
            }
          } catch (e: any) {
            const updatedPlatforms = await getContactPlatforms();
            const found = updatedPlatforms.find(
              (p) => normalize(p.name || "") === platformName
            );
            if (found?.id !== undefined && found?.id !== null) {
              platformId = found.id;
              platformMap.set(platformName, platformId);
            }
          }
        }
      }

      // Resolve priority
      let priorityId: string | null = null;
      if (row.priority) {
        const priorityName = normalize(String(row.priority || ""));
        priorityId = priorityMap.get(priorityName) || null;
      }

      try {
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const normalizedAlternativePhone = normalizePhoneNumber(
          safeStringTrim(row.alternativePhoneNumber)
        );

        const createdLead = await createSalesLead({
          first_name: firstName,
          last_name: lastName || null,
          email: email || null,
          phone_number: normalizedPhone,
          location: safeStringTrim(row.location),
          contact_time_zone: null,
          status: row.status || "pipeline",
          workspace_id: workspaceId,
          platform: platformId,
          priority: priorityId,
          contact_id: null,
          owner_id: null,
          alternative_email: safeStringTrim(row.alternativeEmail),
          alternative_phone_number:
            normalizedAlternativePhone != null
              ? String(normalizedAlternativePhone)
              : null,
          business_contact: safeStringTrim(row.businessContact),
          business_linkedin: safeStringTrim(row.businessLinkedin),
          business_name: safeStringTrim(row.businessName),
          comment: safeStringTrim(row.comment),
          linkedin_url: safeStringTrim(row.linkedinUrl),
        });

        // Automatically assign the lead to the importer (like POST endpoint does)
        // This ensures imported leads show up in the frontend when filtered by userId
        try {
          const { addLeadAssignee } = await import("@/lib/data/lead-assignees");
          await addLeadAssignee(
            createdLead.id,
            requesterUserId,
            requesterUserId
          );
        } catch (assignError: any) {
          // Log error but don't fail the import
          console.error("Failed to auto-assign imported lead:", {
            leadId: createdLead.id,
            userId: requesterUserId,
            error: assignError?.message || assignError,
          });
          // If it's just a duplicate assignment, that's okay - continue
        }

        successful++;
      } catch (e: any) {
        failed++;
        const errorMessage = e?.message || "create failed";
        errors.push(`Row ${rowIdx}: ${errorMessage}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { successful, failed, duplicates, errors: errors.slice(0, 50) },
    });
  } catch (error) {
    console.error("Error importing sales leads:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import sales leads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

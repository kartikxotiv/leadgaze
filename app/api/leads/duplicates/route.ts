import { NextRequest, NextResponse } from "next/server";
import { getLeads, getLeadWithRelations } from "@/lib/data/leads";
import { supabase } from "@/lib/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    const firstName = (searchParams.get("firstName") || "").trim();
    const lastName = (searchParams.get("lastName") || "").trim();
    const businessName = (searchParams.get("businessName") || "").trim();
    const phone = (searchParams.get("phone") || "").trim();
    const workspaceId = (searchParams.get("workspaceId") || "").trim();

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "organizationId is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('leads')
      .select(`
        *,
        status:leads_config!leads_status_id_fkey(id, entity_value),
        source_config:leads_config!leads_source_id_fkey(id, entity_value)
      `)
      .eq('organization_id', organizationId)
      .limit(25);

    // Build OR conditions
    const conditions: string[] = [];

    if (email) {
      conditions.push(`email.eq.${email}`);
    }

    if (phone) {
      conditions.push(`phone.ilike.%${phone}%`);
    }

    if (firstName && lastName && businessName) {
      // Need to use AND within OR - Supabase doesn't support this directly
      // We'll filter in memory for complex AND within OR
      query = query.or(`email.eq.${email},phone.ilike.%${phone}%`);
    } else {
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
    }

    const { data: allLeads, error } = await query;

    if (error) throw error;

    // Filter duplicates - check all conditions
    let duplicates = (allLeads || []).filter((lead: any) => {
      let matches = false;

      if (email && lead.email?.toLowerCase() === email.toLowerCase()) {
        matches = true;
      }

      if (phone && lead.phone?.toLowerCase().includes(phone.toLowerCase())) {
        matches = true;
      }

      if (firstName && lastName && businessName) {
        const matchesFirst = lead.first_name?.toLowerCase().includes(firstName.toLowerCase());
        const matchesLast = lead.last_name?.toLowerCase().includes(lastName.toLowerCase());
        const matchesBusiness = lead.business_name?.toLowerCase().includes(businessName.toLowerCase());
        if (matchesFirst && matchesLast && matchesBusiness) {
          matches = true;
        }
      }

      // Filter by workspaceId if provided
      if (workspaceId && lead.metadata?.workspaceId !== workspaceId) {
        return false;
      }

      return matches;
    });

    // Limit to 25
    duplicates = duplicates.slice(0, 25);

    return NextResponse.json({ success: true, data: duplicates });
  } catch (error) {
    console.error("Error detecting lead duplicates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to detect lead duplicates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

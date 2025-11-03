import { NextRequest, NextResponse } from "next/server";
import { getLeadById, updateLead, deleteLead } from "@/lib/data/leads";
import { updateDeal } from "@/lib/data/deals";
import { updateActivity } from "@/lib/data/activities";
import { updateTask } from "@/lib/data/tasks";
import { supabase } from "@/lib/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, primaryLeadId, duplicateLeadIds } = body || {};

    if (
      !organizationId ||
      !primaryLeadId ||
      !Array.isArray(duplicateLeadIds) ||
      duplicateLeadIds.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "organizationId, primaryLeadId and duplicateLeadIds are required",
        },
        { status: 400 }
      );
    }

    // Sanitize duplicates
    const sanitizedDuplicates: string[] = Array.isArray(duplicateLeadIds)
      ? duplicateLeadIds.filter((id: string) => id && id !== primaryLeadId)
      : [];

    // Get primary lead
    const primary = await getLeadById(primaryLeadId);
    if (!primary || primary.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Primary lead not found" },
        { status: 404 }
      );
    }

    if (sanitizedDuplicates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid duplicate leads to merge" },
        { status: 400 }
      );
    }

    // Get duplicate leads
    const duplicatesPromises = sanitizedDuplicates.map(id => getLeadById(id));
    const duplicatesResults = await Promise.all(duplicatesPromises);
    const duplicatesExisting = duplicatesResults.filter(
      (lead) => lead && lead.organization_id === organizationId
    );

    if (duplicatesExisting.length !== sanitizedDuplicates.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Some duplicate leads were not found in the organization",
        },
        { status: 404 }
      );
    }

    // Update deals - change lead_id to primary
    for (const dupId of sanitizedDuplicates) {
      const { data: deals } = await supabase
        .from('deals')
        .select('deal_id')
        .eq('lead_id', dupId);
      
      if (deals && deals.length > 0) {
        for (const deal of deals) {
          await updateDeal(deal.deal_id, { lead_id: primaryLeadId });
        }
      }
    }

    // Update activities - change related_id to primary
    for (const dupId of sanitizedDuplicates) {
      const { data: activities } = await supabase
        .from('activities')
        .select('activity_id')
        .eq('related_type', 'lead')
        .eq('related_id', dupId);
      
      if (activities && activities.length > 0) {
        for (const activity of activities) {
          await updateActivity(activity.activity_id, { related_id: primaryLeadId });
        }
      }
    }

    // Update tasks - change lead_id to primary
    for (const dupId of sanitizedDuplicates) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('task_id')
        .eq('lead_id', dupId);
      
      if (tasks && tasks.length > 0) {
        for (const task of tasks) {
          await updateTask(task.task_id, { lead_id: primaryLeadId });
        }
      }
    }

    // Consolidate data from duplicates into primary
    const consolidated: any = {};
    const fillIfEmpty = (key: string, extractor: (l: any) => any) => {
      if (!(primary as any)[key]) {
        for (const dup of duplicatesExisting) {
          const val = extractor(dup);
          if (val) {
            consolidated[key] = val;
            break;
          }
        }
      }
    };

    fillIfEmpty("email", (l: any) => l.email);
    fillIfEmpty("phone", (l: any) => l.phone);
    fillIfEmpty("business_name", (l: any) => l.business_name);
    fillIfEmpty("company_website", (l: any) => l.company_website);
    fillIfEmpty("job_title", (l: any) => l.job_title);
    fillIfEmpty("qualification_notes", (l: any) => l.qualification_notes);

    // Merge tags
    try {
      const primaryTags: string[] = Array.isArray(primary.tags)
        ? (primary.tags as string[])
        : [];
      const duplicateTags: string[] = duplicatesExisting.flatMap((d: any) =>
        Array.isArray(d.tags) ? (d.tags as string[]) : []
      );
      const mergedTags = Array.from(
        new Set([...primaryTags, ...duplicateTags].filter(Boolean))
      );
      if (
        mergedTags.length &&
        JSON.stringify(mergedTags) !== JSON.stringify(primaryTags)
      ) {
        consolidated.tags = mergedTags;
      }
    } catch {}

    // Merge metadata
    try {
      const mergedMeta: any = { ...(primary.metadata || {}) };
      for (const dup of duplicatesExisting) {
        const md = dup.metadata || {};
        for (const key of Object.keys(md)) {
          if (
            mergedMeta[key] === undefined ||
            mergedMeta[key] === null ||
            mergedMeta[key] === ""
          ) {
            mergedMeta[key] = md[key];
          }
        }
      }
      if (Object.keys(mergedMeta).length > 0) {
        consolidated.metadata = mergedMeta;
      }
    } catch {}

    // Update primary lead with consolidated data
    if (Object.keys(consolidated).length > 0) {
      await updateLead(primaryLeadId, consolidated);
    }

    // Delete duplicate leads
    for (const dupId of sanitizedDuplicates) {
      await deleteLead(dupId);
    }

    // Get updated primary lead
    const updatedPrimary = await getLeadById(primaryLeadId);

    return NextResponse.json({
      success: true,
      message: "Leads merged successfully",
      data: updatedPrimary,
    });
  } catch (error) {
    console.error("Error merging leads:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to merge leads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

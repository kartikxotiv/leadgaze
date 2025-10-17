import { NextRequest, NextResponse } from "next/server";
import { sequelize, Lead, Deal, Activity, Task } from "@/models";

export async function POST(request: NextRequest) {
  const t = await (sequelize as any).transaction();
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

   
    const sanitizedDuplicates: string[] = Array.isArray(duplicateLeadIds)
      ? duplicateLeadIds.filter((id: string) => id && id !== primaryLeadId)
      : [];

    const primary = await (Lead as any).findOne({
      where: { leadId: primaryLeadId, organizationId },
      transaction: t,
    });
    if (!primary) {
      await t.rollback();
      return NextResponse.json(
        { success: false, error: "Primary lead not found" },
        { status: 404 }
      );
    }

    if (sanitizedDuplicates.length === 0) {
      await t.rollback();
      return NextResponse.json(
        { success: false, error: "No valid duplicate leads to merge" },
        { status: 400 }
      );
    }

   
    const duplicatesExisting = await (Lead as any).findAll({
      where: { leadId: sanitizedDuplicates, organizationId },
      attributes: [
        "leadId",
        "tags",
        "metaData",
        "email",
        "phone",
        "businessName",
        "companyWebsite",
        "jobTitle",
        "qualificationNotes",
      ],
      transaction: t,
    });
    if (duplicatesExisting.length !== sanitizedDuplicates.length) {
      await t.rollback();
      return NextResponse.json(
        {
          success: false,
          error: "Some duplicate leads were not found in the organization",
        },
        { status: 404 }
      );
    }

   
    await (Deal as any).update(
      { leadId: primaryLeadId },
      { where: { leadId: sanitizedDuplicates }, transaction: t }
    );

   
    await (Activity as any).update(
      { relatedId: primaryLeadId },
      {
        where: { relatedType: "lead", relatedId: sanitizedDuplicates },
        transaction: t,
      }
    );

   
    await (Task as any).update(
      { leadId: primaryLeadId },
      { where: { leadId: sanitizedDuplicates }, transaction: t }
    );

   
    const duplicates = duplicatesExisting;
    const consolidated: any = {};
    const fillIfEmpty = (key: string, extractor: (l: any) => any) => {
      if (!primary[key]) {
        for (const dup of duplicates) {
          const val = extractor(dup);
          if (val) {
            consolidated[key] = val;
            break;
          }
        }
      }
    };

    fillIfEmpty("email", (l) => l.email);
    fillIfEmpty("phone", (l) => l.phone);
    fillIfEmpty("businessName", (l) => l.businessName);
    fillIfEmpty("companyWebsite", (l) => l.companyWebsite);
    fillIfEmpty("jobTitle", (l) => l.jobTitle);
    fillIfEmpty("qualificationNotes", (l) => l.qualificationNotes);

   
    try {
      const primaryTags: string[] = Array.isArray((primary as any).tags)
        ? ((primary as any).tags as string[])
        : [];
      const duplicateTags: string[] = duplicates.flatMap((d: any) =>
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

   
    try {
      const mergedMeta: any = { ...((primary as any).metaData || {}) };
      for (const dup of duplicates) {
        const md = (dup as any).metaData || {};
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
        consolidated.metaData = mergedMeta;
      }
    } catch {}

    if (Object.keys(consolidated).length > 0) {
      await primary.update(consolidated, { transaction: t });
    }

   
    await (Lead as any).destroy({
      where: { leadId: sanitizedDuplicates, organizationId },
      transaction: t,
    });

   
    const updatedPrimary = await (Lead as any).findByPk(
      (primary as any).leadId,
      { transaction: t }
    );

    await t.commit();
    return NextResponse.json({
      success: true,
      message: "Leads merged successfully",
      data: updatedPrimary,
    });
  } catch (error) {
    await t.rollback();
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

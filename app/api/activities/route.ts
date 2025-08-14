import { NextRequest, NextResponse } from "next/server";
import { Activity, Lead, User } from "@/models";
import { Op } from "sequelize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relatedType = searchParams.get("relatedType");
    const relatedId = searchParams.get("relatedId");
    const activityType = searchParams.get("activityType");
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const whereClause: any = {};

    if (relatedType) whereClause.relatedType = relatedType;
    if (relatedId) whereClause.relatedId = relatedId;
    if (activityType) whereClause.activityType = activityType;
    if (userId) whereClause.userId = userId;

    const { count, rows: activities } = await Activity.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          total: count,
          limit,
          offset,
          pages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch activities",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Received activity creation request:", body);

    // Validate required fields
    const requiredFields = [
      "activityType",
      "relatedType",
      "relatedId",
      "subject",
      "userId",
    ];

    for (const field of requiredFields) {
      if (
        !body[field] ||
        body[field] === "" ||
        body[field] === null ||
        body[field] === undefined
      ) {
        console.error(`Missing or empty required field: ${field}`, {
          value: body[field],
          type: typeof body[field],
          allFields: body,
        });

        let errorMessage = `Missing or empty required field: ${field}`;
        let helpMessage = "";

        // Provide specific help for relatedId
        if (field === "relatedId") {
          errorMessage =
            "A lead or deal must be selected to create an activity";
          helpMessage =
            "Please select a lead or deal from the dropdown before creating this follow-up task.";
        }

        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
            help: helpMessage,
            received: Object.keys(body),
            fieldValue: body[field],
            fieldType: typeof body[field],
          },
          { status: 400 }
        );
      }
    }

    // Validate enum values
    const validActivityTypes = [
      "call",
      "email",
      "linkedin",
      "meeting",
      "task",
      "note",
      "demo",
      "proposal_sent",
      "lead_created",
      "lead_updated",
      "status_changed",
      "score_updated",
      "deal_created",
      "deal_moved",
      "task_created",
      "task_completed",
      "follow_up_scheduled",
    ];

    const validRelatedTypes = ["lead", "deal", "contact", "company"];
    const validPriorities = ["low", "medium", "high", "urgent"];

    if (!validActivityTypes.includes(body.activityType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid activityType: ${body.activityType}`,
          validValues: validActivityTypes,
        },
        { status: 400 }
      );
    }

    if (!validRelatedTypes.includes(body.relatedType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid relatedType: ${body.relatedType}`,
          validValues: validRelatedTypes,
        },
        { status: 400 }
      );
    }

    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid priority: ${body.priority}`,
          validValues: validPriorities,
        },
        { status: 400 }
      );
    }

    console.log("About to create activity with validated data:", body);

    // Create activity
    const activity = await Activity.create({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Activity created successfully:", activity.dataValues);

    // Fetch created activity without associations for now
    const createdActivity = await Activity.findByPk(
      (activity as any).activityId
    );

    return NextResponse.json({
      success: true,
      data: createdActivity,
      message: "Activity created successfully",
    });
  } catch (error) {
    console.error("Error creating activity:", error);

    // Provide more detailed error information
    let errorMessage = "Failed to create activity";
    let errorDetails = "Unknown error";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;

      // Check for specific database errors
      if (
        error.message.includes("validation") ||
        error.message.includes("constraint")
      ) {
        errorMessage = "Database validation error";
      } else if (
        error.message.includes("connection") ||
        error.message.includes("ECONNREFUSED")
      ) {
        errorMessage = "Database connection error";
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getActivitiesPaginated, createActivity, getActivityById } from "@/lib/data/activities";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relatedType = searchParams.get("relatedType");
    const relatedId = searchParams.get("relatedId");
    const activityType = searchParams.get("activityType");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const filters: Record<string, any> = {};
    if (relatedType) filters.related_type = relatedType;
    if (relatedId) filters.related_id = relatedId;
    if (activityType) filters.activity_type = activityType;
    if (userId) filters.user_id = userId;

    const result = await getActivitiesPaginated(
      Object.keys(filters).length > 0 ? filters : undefined,
      page,
      limit
    );

    return NextResponse.json({
      success: true,
      data: {
        activities: result.data,
        pagination: {
          total: result.total,
          limit,
          offset: result.offset,
          pages: result.totalPages,
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

    // Convert camelCase to snake_case
    const activityData: any = {
      activity_type: body.activityType,
      related_type: body.relatedType,
      related_id: body.relatedId,
      subject: body.subject,
      user_id: body.userId,
      description: body.description || null,
      outcome: body.outcome || null,
      priority: body.priority || "medium",
      metadata: body.metadata || null,
    };

    const activity = await createActivity(activityData);

    console.log("Activity created successfully:", activity);

    // Get created activity with relations
    const createdActivity = await getActivityById(activity.activity_id);

    return NextResponse.json({
      success: true,
      data: createdActivity,
      message: "Activity created successfully",
    });
  } catch (error) {
    console.error("Error creating activity:", error);

   
    let errorMessage = "Failed to create activity";
    let errorDetails = "Unknown error";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || error.message;

     
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

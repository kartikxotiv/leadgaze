import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getTasksPaginated, createTask, getTaskById } from "@/lib/data/tasks";
import type {
  CreateTaskRequest,
  TaskFilters,
  PaginatedResponse,
} from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: TaskFilters = {
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      type: searchParams.get("type") || undefined,
      assigned_to: searchParams.get("assigned_to") || undefined,
      lead_id: searchParams.get("lead_id") || undefined,
      completed:
        searchParams.get("completed") === "true"
          ? true
          : searchParams.get("completed") === "false"
          ? false
          : undefined,
      search: searchParams.get("search") || undefined,
    };

    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const workspaceId = searchParams.get("workspaceId") || undefined;

    // Build filters
    const taskFilters: Record<string, any> = {};
    if (filters.status) taskFilters.status = filters.status;
    if (filters.priority) taskFilters.priority = filters.priority;
    if (filters.type) taskFilters.type = filters.type;
    if (filters.assigned_to) taskFilters.assigned_to = filters.assigned_to;
    if (filters.lead_id) taskFilters.lead_id = filters.lead_id;
    // Handle completed filter - need to query differently for this
    // For now, we'll filter after fetching

    const result = await getTasksPaginated(
      Object.keys(taskFilters).length > 0 ? taskFilters : undefined,
      page,
      limit,
      filters.search
    );

    // Filter by completed status if specified
    let filteredData = result.data;
    if (filters.completed !== undefined) {
      filteredData = filteredData.filter((t: any) => {
        return filters.completed ? t.status === "Completed" : t.status !== "Completed";
      });
    }

    // Filter by workspaceId if provided (client-side filtering for now)
    if (workspaceId) {
      filteredData = filteredData.filter((t: any) => {
        const leadWs = t?.lead?.metadata?.workspaceId;
        const dealWs = t?.deal?.metadata?.workspaceId;
        return leadWs === workspaceId || dealWs === workspaceId;
      });
    }

    const total = (workspaceId || filters.completed !== undefined) ? filteredData.length : result.total;
    const pagedData = (workspaceId || filters.completed !== undefined)
      ? filteredData.slice((page - 1) * limit, page * limit)
      : result.data;

    const response: PaginatedResponse<any> = {
      data: pagedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskRequest = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "Task title is required" },
        { status: 400 }
      );
    }

   
    let createdBy: string | undefined = (body as any).created_by;
    if (!createdBy) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          createdBy = decoded.userId;
        } catch {
         
        }
      }
    }

    if (!createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: "created_by is required (provide in body or via JWT)",
        },
        { status: 400 }
      );
    }

    // Convert to snake_case
    const taskData: any = {
      title: body.title,
      description: body.description || null,
      type: (body.type as any) || "Task",
      priority: (body.priority as any) || "Medium",
      status: (body.status as any) || "Pending",
      due_date: body.due_date ? new Date(body.due_date).toISOString() : null,
      lead_id: body.lead_id || null,
      deal_id: body.deal_id || null,
      assigned_to: body.assigned_to || null,
      created_by: createdBy,
    };

    const createdTask = await createTask(taskData);

    return NextResponse.json({
      data: createdTask,
      success: true,
      message: "Task created successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

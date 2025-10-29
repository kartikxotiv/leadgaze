import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { Task, User, Lead, Deal } from "@/models";
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

    const whereClause: any = {};
    if (filters.status) whereClause.status = filters.status;
    if (filters.priority) whereClause.priority = filters.priority;
    if (filters.type) whereClause.type = filters.type;
    if (filters.assigned_to) whereClause.assignedTo = filters.assigned_to;
    if (filters.lead_id) whereClause.leadId = filters.lead_id;
    if (filters.completed !== undefined) {
      whereClause.status = filters.completed
        ? "Completed"
        : { [Op.ne]: "Completed" };
    }
    if (filters.search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await (Task as any).findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "assignedUser",
          attributes: ["firstName", "lastName", "email"],
        },
        {
          model: User,
          as: "createdUser",
          attributes: ["firstName", "lastName", "email"],
        },
        {
          model: Lead,
          as: "lead",
          attributes: [
            "leadId",
            "firstName",
            "lastName",
            "businessName",
            "metaData",
          ],
          required: false,
        },
        {
          model: Deal,
          as: "deal",
          attributes: ["dealId", "title", "metadata"],
          required: false,
        },
      ],
      order: [
        ["dueDate", "ASC"],
        ["createdAt", "DESC"],
      ],
      limit,
      offset,
    });

   
    let filteredRows = rows;
    if (workspaceId) {
      filteredRows = rows.filter((t: any) => {
        const leadWs = t?.lead?.metaData?.workspaceId;
        const dealWs = t?.deal?.metadata?.workspaceId;
        return leadWs === workspaceId || dealWs === workspaceId;
      });
    }

    const total = workspaceId ? filteredRows.length : count || 0;
    const pagedData = workspaceId
      ? filteredRows.slice(0, limit)
      : rows;

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

    const payload: any = {
      title: body.title,
      description: body.description || null,
      type: (body.type as any) || "Task",
      priority: (body.priority as any) || "Medium",
      status: (body.status as any) || "Pending",
      dueDate: body.due_date ? new Date(body.due_date) : null,
      leadId: body.lead_id || null,
      dealId: body.deal_id || null,
      assignedTo: body.assigned_to || null,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await (Task as any).create(payload);

    const createdTask = await (Task as any).findByPk((created as any).taskId, {
      include: [
        {
          model: User,
          as: "assignedUser",
          attributes: ["firstName", "lastName", "email"],
        },
        {
          model: User,
          as: "createdUser",
          attributes: ["firstName", "lastName", "email"],
        },
      ],
    });

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

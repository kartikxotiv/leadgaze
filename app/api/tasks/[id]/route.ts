import { NextRequest, NextResponse } from "next/server";
import { Task, User } from "@/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await (Task as any).findByPk(id, {
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
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const task = await (Task as any).findByPk(id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type !== undefined) updates.type = body.type;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.status !== undefined) updates.status = body.status;
    if (body.due_date !== undefined)
      updates.dueDate = body.due_date ? new Date(body.due_date) : null;
    if (body.assigned_to !== undefined)
      updates.assignedTo = body.assigned_to || null;
    if (body.lead_id !== undefined) updates.leadId = body.lead_id || null;
    if (body.deal_id !== undefined) updates.dealId = body.deal_id || null;

    updates.updatedAt = new Date();

    await task.update(updates);

    const updated = await (Task as any).findByPk(id, {
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
      success: true,
      data: updated,
      message: "Task updated",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await (Task as any).findByPk(id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }
    await task.destroy();
    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

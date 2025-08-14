import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("pipeline_stages")
      .select("*")
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: data || [],
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Stage name is required" },
        { status: 400 }
      );
    }

    // Get the next position
    const { data: lastStage } = await supabase
      .from("pipeline_stages")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (lastStage?.position || 0) + 1;

    const { data, error } = await supabase
      .from("pipeline_stages")
      .insert([
        {
          name,
          color: color || "bg-gray-500",
          description,
          position: nextPosition,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data,
      success: true,
      message: "Pipeline stage created successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

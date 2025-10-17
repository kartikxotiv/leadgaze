import { NextRequest, NextResponse } from "next/server";
import sequelize from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
   
    const [userInvitationsColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_invitations' 
      ORDER BY ordinal_position;
    `);

    return NextResponse.json({
      success: true,
      data: {
        userInvitationsColumns,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Schema debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get schema info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

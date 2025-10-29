import { NextRequest, NextResponse } from "next/server";
import sequelize from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
   
    const [usersColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);

   
    const [organizationsColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'organizations' 
      ORDER BY ordinal_position;
    `);

   
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    return NextResponse.json({
      success: true,
      data: {
        tables,
        usersColumns,
        organizationsColumns,
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

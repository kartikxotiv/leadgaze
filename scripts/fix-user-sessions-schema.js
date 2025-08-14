const { Sequelize } = require("sequelize");
const pg = require("pg");

// Database connection
const sequelize = new Sequelize("postgres://sidharthverma@localhost/crm", {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
});

async function fixUserSessionsSchema() {
  try {
    console.log("🔧 Fixing user_sessions table schema...");

    await sequelize.authenticate();
    console.log("✅ Database connected!");

    // Check current schema
    console.log("📋 Checking current schema...");
    const [currentColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      ORDER BY ordinal_position;
    `);

    console.log(
      "Current columns:",
      currentColumns.map((c) => c.column_name)
    );

    // Fix the primary key column name
    console.log("🔧 Renaming primary key column...");

    try {
      await sequelize.query(`
        ALTER TABLE user_sessions 
        RENAME COLUMN id TO user_session_id;
      `);
      console.log("   ✅ Renamed id to user_session_id");
    } catch (error) {
      console.log(
        "   ⚠️  Column rename failed or already correct:",
        error.message
      );
    }

    // Check final schema
    console.log("\n📋 Final schema check...");
    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      ORDER BY ordinal_position;
    `);

    console.log(
      "Final columns:",
      finalColumns.map((c) => c.column_name)
    );

    console.log("\n✅ user_sessions schema fixed!");
    console.log("📊 Table now matches Sequelize model expectations");
  } catch (error) {
    console.error("❌ Schema fix failed:", error);
    throw error;
  }
}

// Run the fix if this file is executed directly
if (require.main === module) {
  fixUserSessionsSchema()
    .then(() => {
      console.log("✅ Schema fix completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Schema fix failed:", error);
      process.exit(1);
    });
}

module.exports = { fixUserSessionsSchema };

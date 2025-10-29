const { Sequelize } = require("sequelize");
const pg = require("pg");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
});

async function fixOrganizationConfigSchema() {
  try {
    console.log("🔧 Fixing OrganizationConfig table schema...");

    await sequelize.authenticate();
    console.log("✅ Database connected!");

   
    console.log("📋 Checking current schema...");
    const [currentColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'organization_config' 
      ORDER BY ordinal_position;
    `);

    console.log(
      "Current columns:",
      currentColumns.map((c) => c.column_name)
    );

   
    console.log("➕ Adding missing columns...");

   
    try {
      await sequelize.query(`
        ALTER TABLE organization_config 
        ADD COLUMN IF NOT EXISTS numeric_value INTEGER;
      `);
      console.log("   ✅ Added numeric_value column");
    } catch (error) {
      console.log(
        "   ⚠️  numeric_value column already exists or error:",
        error.message
      );
    }

   
    try {
      await sequelize.query(`
        ALTER TABLE organization_config 
        ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
      `);
      console.log("   ✅ Added display_name column");
    } catch (error) {
      console.log(
        "   ⚠️  display_name column already exists or error:",
        error.message
      );
    }

   
    try {
      await sequelize.query(`
        ALTER TABLE organization_config 
        DROP COLUMN IF EXISTS config_data;
      `);
      console.log("   ✅ Removed unused config_data column");
    } catch (error) {
      console.log(
        "   ⚠️  config_data column doesn't exist or error:",
        error.message
      );
    }

   
    console.log("\n📋 Final schema check...");
    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'organization_config' 
      ORDER BY ordinal_position;
    `);

    console.log(
      "Final columns:",
      finalColumns.map((c) => c.column_name)
    );

    console.log("\n✅ OrganizationConfig schema fixed!");
    console.log("📊 Table now matches Sequelize model expectations");
  } catch (error) {
    console.error("❌ Schema fix failed:", error);
    throw error;
  }
}

if (require.main === module) {
  fixOrganizationConfigSchema()
    .then(() => {
      console.log("✅ Schema fix completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Schema fix failed:", error);
      process.exit(1);
    });
}

module.exports = { fixOrganizationConfigSchema };

const { Sequelize } = require("sequelize");
const pg = require("pg");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
});

async function fixUserOrganizationsSchema() {
  try {
    console.log("🔧 Fixing user_organizations table schema...");

    await sequelize.authenticate();
    console.log("✅ Database connected!");

   
    console.log("📋 Checking current schema...");
    const [currentColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_organizations' 
      ORDER BY ordinal_position;
    `);

    console.log(
      "Current columns:",
      currentColumns.map((c) => c.column_name)
    );

   
    console.log("🔧 Renaming primary key column...");

    try {
      await sequelize.query(`
        ALTER TABLE user_organizations 
        RENAME COLUMN id TO user_organization_id;
      `);
      console.log("   ✅ Renamed id to user_organization_id");
    } catch (error) {
      console.log(
        "   ⚠️  Column rename failed or already correct:",
        error.message
      );
    }

   
    console.log("\n📋 Final schema check...");
    const [finalColumns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_organizations' 
      ORDER BY ordinal_position;
    `);

    console.log(
      "Final columns:",
      finalColumns.map((c) => c.column_name)
    );

    console.log("\n✅ user_organizations schema fixed!");
    console.log("📊 Table now matches Sequelize model expectations");
  } catch (error) {
    console.error("❌ Schema fix failed:", error);
    throw error;
  }
}

if (require.main === module) {
  fixUserOrganizationsSchema()
    .then(() => {
      console.log("✅ Schema fix completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Schema fix failed:", error);
      process.exit(1);
    });
}

module.exports = { fixUserOrganizationsSchema };

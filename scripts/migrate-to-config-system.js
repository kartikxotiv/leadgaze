const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

async function migrateToConfigSystem() {
  try {
    console.log("🔄 Starting migration to config-based system...");

   
    await sequelize.authenticate();
    console.log("✅ Database connected!");

   
    const {
      User,
      Organization,
      UserOrganization,
      UserConfig,
      OrganizationConfig,
      OrganizationRole,
      UserInvitation,
      EmailVerification,
      PasswordResetToken,
      OrganizationWorkspace,
    } = require("../models/index.js");

    console.log("🗑️  Dropping existing tables with foreign key constraints...");

   
    const tablesToDrop = [
      "deals",
      "leads",
      "pipeline_stages",
      "activities",
      "tasks",
      "user_sessions",
      "user_organizations",
      "organizations",
      "users",
     
      "user_invitations",
      "email_verifications",
      "password_reset_tokens",
      "organization_workspaces",
      "organization_roles",
      "organization_config",
      "users_config",
    ];

    for (const table of tablesToDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`  ✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Could not drop table ${table}: ${error.message}`);
      }
    }

    console.log("🆕 Creating new tables with config system...");

   
    await sequelize.sync({ force: true });
    console.log("✅ All tables created successfully!");

    console.log("🌱 Seeding config data...");

   
    const { seedConfigData } = require("./seed-config-data");
    await seedConfigData();

    console.log("✅ Migration to config system completed successfully!");

    console.log("\n📋 Created Tables:");
    console.log("📁 Config Tables:");
    console.log("  - users_config (user statuses, invitation statuses)");
    console.log(
      "  - organization_config (company sizes, org statuses, subscription statuses, plan types, limits)"
    );
    console.log(
      "  - organization_roles (owner, admin, manager, viewer with JSON permissions)"
    );

    console.log("\n📁 Auth Tables:");
    console.log(
      "  - users (with status_id FK and last_visited_organization_id)"
    );
    console.log(
      "  - organizations (with config FKs for company_size, status, subscription, plan)"
    );
    console.log("  - user_organizations (with role_id FK)");
    console.log("  - user_invitations (with status_id and role_id FKs)");
    console.log("  - email_verifications");
    console.log("  - password_reset_tokens");
    console.log("  - organization_workspaces");
    console.log("  - user_sessions");

    console.log("\n📁 CRM Tables:");
    console.log("  - tasks");
    console.log("  - activities");
    console.log("  - pipeline_stages");
    console.log("  - leads");
    console.log("  - deals");

    console.log("\n🎯 Next Steps:");
    console.log("1. ✅ Models created with normalized config system");
    console.log("2. ✅ Config data seeded with proper values");
    console.log("3. 🔄 Update API endpoints to work with new FKs");
    console.log("4. 🔄 Implement 6-step signup flow");
    console.log("5. 🔄 Implement invitation system");
    console.log("6. 🔄 Create permission helper utilities");
    console.log("7. 🔄 Test authentication flows");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateToConfigSystem();
}

module.exports = { migrateToConfigSystem };

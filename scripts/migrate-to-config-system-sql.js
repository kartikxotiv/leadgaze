const { Sequelize } = require("sequelize");
const pg = require("pg");

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
});

async function migrateToConfigSystemSQL() {
  try {
    console.log("🔄 Starting migration to config-based system...");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    console.log("🗑️  Dropping existing tables with foreign key constraints...");

    // Drop tables in reverse dependency order
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
      // Config tables (if they exist)
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
        console.log(`   ✅ Dropped ${table}`);
      } catch (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }

    console.log("\n📋 Creating new config-based tables...");

    // Create users_config table
    console.log("   Creating users_config...");
    await sequelize.query(`
      CREATE TABLE "users_config" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_value" VARCHAR(100) NOT NULL,
        "display_name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN DEFAULT true,
        "sort_order" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE("entity_type", "entity_value")
      );
    `);

    // Create organization_config table
    console.log("   Creating organization_config...");
    await sequelize.query(`
      CREATE TABLE "organization_config" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "entity_type" VARCHAR(50) NOT NULL,
        "entity_value" VARCHAR(100) NOT NULL,
        "display_name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "config_data" JSONB,
        "is_active" BOOLEAN DEFAULT true,
        "sort_order" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE("entity_type", "entity_value")
      );
    `);

    // Create organization_roles table
    console.log("   Creating organization_roles...");
    await sequelize.query(`
      CREATE TABLE "organization_roles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "role" VARCHAR(50) NOT NULL UNIQUE,
        "display_name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "permissions" JSONB NOT NULL DEFAULT '{}',
        "hierarchy_level" INTEGER NOT NULL DEFAULT 0,
        "is_system_role" BOOLEAN DEFAULT false,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create users table with new schema
    console.log("   Creating users...");
    await sequelize.query(`
      CREATE TABLE "users" (
        "user_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "phone_number" VARCHAR(20),
        "email_verified" BOOLEAN DEFAULT false,
        "status_id" UUID REFERENCES "users_config"("id"),
        "last_visited_organization_id" UUID,

        "last_login" TIMESTAMP WITH TIME ZONE,
        "login_attempts" INTEGER DEFAULT 0,
        "lock_until" TIMESTAMP WITH TIME ZONE,
        "password_reset_token" VARCHAR(255),
        "password_reset_expires" TIMESTAMP WITH TIME ZONE,
        "password_changed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create organizations table with new schema
    console.log("   Creating organizations...");
    await sequelize.query(`
      CREATE TABLE "organizations" (
        "organization_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(255) NOT NULL UNIQUE,
        "description" TEXT,
        "industry_type" VARCHAR(100),
        "company_size_config_id" UUID REFERENCES "organization_config"("id"),
        "primary_use_case" VARCHAR(255),
        "current_tool" VARCHAR(255),
        "logo_url" VARCHAR(500),
        "website" VARCHAR(255),
        "address" TEXT,
        "city" VARCHAR(100),
        "state" VARCHAR(100),
        "postal_code" VARCHAR(20),
        "country" VARCHAR(100),
        "phone" VARCHAR(20),
        "created_by" UUID REFERENCES "users"("user_id"),
        "status_id" UUID REFERENCES "organization_config"("id"),
        "subscription_status_id" UUID REFERENCES "organization_config"("id"),
        "plan_type_id" UUID REFERENCES "organization_config"("id"),
        "trial_starts_at" TIMESTAMP WITH TIME ZONE,
        "trial_ends_at" TIMESTAMP WITH TIME ZONE,
        "subscription_starts_at" TIMESTAMP WITH TIME ZONE,
        "subscription_ends_at" TIMESTAMP WITH TIME ZONE,
        "billing_email" VARCHAR(255),
        "max_users" INTEGER DEFAULT 5,
        "max_workspaces" INTEGER DEFAULT 3,
        "max_storage_gb" INTEGER DEFAULT 10,
        "features_enabled" JSONB DEFAULT '[]',
        "settings" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Add foreign key constraint for last_visited_organization_id
    await sequelize.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "users_last_visited_organization_id_fkey" 
      FOREIGN KEY ("last_visited_organization_id") 
      REFERENCES "organizations"("organization_id");
    `);

    // Create user_organizations table with new schema
    console.log("   Creating user_organizations...");
    await sequelize.query(`
      CREATE TABLE "user_organizations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
        "organization_id" UUID NOT NULL REFERENCES "organizations"("organization_id") ON DELETE CASCADE,
        "role_id" UUID NOT NULL REFERENCES "organization_roles"("id"),
        "status" VARCHAR(20) DEFAULT 'active',
        "joined_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "invited_by" UUID REFERENCES "users"("user_id"),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE("user_id", "organization_id")
      );
    `);

    // Create user_sessions table
    console.log("   Creating user_sessions...");
    await sequelize.query(`
      CREATE TABLE "user_sessions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
        "current_organization_id" UUID REFERENCES "organizations"("organization_id"),
        "session_token" VARCHAR(500),
        "refresh_token" VARCHAR(500),
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "last_activity_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "ip_address" INET,
        "user_agent" TEXT,
        "device_info" JSONB,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Create additional tables
    console.log("   Creating user_invitations...");
    await sequelize.query(`
      CREATE TABLE "user_invitations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("organization_id") ON DELETE CASCADE,
        "email" VARCHAR(255) NOT NULL,
        "role_id" UUID NOT NULL REFERENCES "organization_roles"("id"),
        "invited_by" UUID NOT NULL REFERENCES "users"("user_id"),
        "status_id" UUID NOT NULL REFERENCES "users_config"("id"),
        "invitation_token" VARCHAR(500) NOT NULL UNIQUE,
        "message" TEXT,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "accepted_at" TIMESTAMP WITH TIME ZONE,
        "accepted_by_user_id" UUID REFERENCES "users"("user_id"),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("   Creating email_verifications...");
    await sequelize.query(`
      CREATE TABLE "email_verifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
        "email" VARCHAR(255) NOT NULL,
        "verification_token" VARCHAR(500) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "verified_at" TIMESTAMP WITH TIME ZONE,
        "attempts" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("   Creating password_reset_tokens...");
    await sequelize.query(`
      CREATE TABLE "password_reset_tokens" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
        "reset_token" VARCHAR(500) NOT NULL UNIQUE,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log("   Creating organization_workspaces...");
    await sequelize.query(`
      CREATE TABLE "organization_workspaces" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "organization_id" UUID NOT NULL REFERENCES "organizations"("organization_id") ON DELETE CASCADE,
        "name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "status_id" UUID REFERENCES "organization_config"("id"),
        "created_by" UUID NOT NULL REFERENCES "users"("user_id"),
        "settings" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE("organization_id", "slug")
      );
    `);

    console.log("\n✅ All tables created successfully!");

    // Now seed the config data
    console.log("\n🌱 Seeding configuration data...");
    const { seedConfigData } = require("./seed-config-data");
    await seedConfigData();

    console.log("\n🎉 Migration completed successfully!");
    console.log(
      "📊 Your database now uses the normalized config-based system!"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateToConfigSystemSQL()
    .then(() => {
      console.log("✅ Migration finished successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateToConfigSystemSQL };



const { Sequelize } = require("sequelize");
require('dotenv').config();

let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  const dbUser = process.env.DB_USER || 'sidharthverma';
  const dbPassword = process.env.DB_PASSWORD ? `:${process.env.DB_PASSWORD}` : '';
  const dbHost = process.env.DB_HOST ;
  const dbPort = process.env.DB_PORT ? `:${process.env.DB_PORT}` : '';
  const dbName = process.env.DB_NAME || 'crm';
  
  DATABASE_URL = `postgres
}

if (!process.env.DATABASE_URL && !process.env.DB_NAME) {
  console.warn("⚠️  No DATABASE_URL or DB_NAME found in environment variables. Using default connection.");
  console.warn("   Set DATABASE_URL or DB_USER, DB_HOST, DB_NAME environment variables for production.");
}

const connectionInfo = DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
console.log(`🔌 Connecting to: ${connectionInfo}`);

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

async function resetDatabaseCompletely() {
  try {
    console.log("🔄 Starting complete database reset...");

   
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    console.log("🗑️  Dropping all tables and constraints...");

   
    const tablesToDrop = [
      'activities',
      'deals', 
      'leads',
      'lead_scores',
      'tasks',
      'notifications',
      'automation_rules',
      'scoring_rules',
      'org_user_accounts',
      'organization_workspaces',
      'user_invitations',
      'user_organizations', 
      'user_sessions',
      'email_otps',
      'email_verifications',
      'password_reset_tokens',
      'users',
      'organizations',
      'organization_roles',
      'organization_config',
      'users_config',
      'leads_config'
    ];

   
    for (const table of tablesToDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`  ✅ Dropped table: ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Could not drop ${table}: ${error.message}`);
      }
    }

    console.log("🔧 Dropping all custom types...");

   
    const enumsToQuery = `
      SELECT n.nspname as "schema",
             t.typname as "name",
             CASE 
                 WHEN t.typtype = 'e' then 'enum'
                 ELSE 'other'
             END as "type"
      FROM pg_type t 
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
      WHERE (t.typrelid = 0 OR (SELECT c.relkind = 'c' FROM pg_catalog.pg_class c WHERE c.oid = t.typrelid)) 
        AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_type el WHERE el.oid = t.typelem AND el.typarray = t.oid)
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')
        AND t.typtype = 'e'
      ORDER BY t.typname;
    `;
    
    const [results] = await sequelize.query(enumsToQuery);
    
    for (const enumType of results) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumType.name}" CASCADE;`);
        console.log(`  ✅ Dropped enum: ${enumType.name}`);
      } catch (error) {
        console.log(`  ⚠️  Could not drop enum ${enumType.name}: ${error.message}`);
      }
    }

    console.log("🔧 Dropping functions...");
    
    try {
      await sequelize.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
      await sequelize.query('DROP FUNCTION IF EXISTS prt_sync_reset_token() CASCADE;');
      console.log("  ✅ Dropped functions");
    } catch (error) {
      console.log(`  ⚠️  Could not drop functions: ${error.message}`);
    }

    console.log("🔧 Dropping SequelizeMeta table...");
    try {
      await sequelize.query('DROP TABLE IF EXISTS "SequelizeMeta" CASCADE;');
      console.log("  ✅ Dropped SequelizeMeta table");
    } catch (error) {
      console.log(`  ⚠️  Could not drop SequelizeMeta: ${error.message}`);
    }

    console.log("\n🎉 Database reset complete!");
    console.log("\n🚀 You can now run migrations from scratch:");
    console.log("   npm run db:migrate");
    console.log("   or");
    console.log("   npx sequelize-cli db:migrate");

  } catch (error) {
    console.error("❌ Error during database reset:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  resetDatabaseCompletely()
    .then(() => {
      console.log("✅ Reset completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Reset failed:", error);
      process.exit(1);
    });
}

module.exports = { resetDatabaseCompletely }; 
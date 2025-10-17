const { Sequelize } = require("sequelize");
const pg = require("pg");

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  logging: false, // Set to console.log if you want to see SQL queries
});

async function clearAuthTables() {
  try {
    console.log("🔌 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    console.log("\n🗑️  Clearing authentication tables...");

    // Clear tables in order (respecting foreign key constraints)

    // 1. Clear user_organizations first (has FKs to users and organizations)
    console.log("   📋 Clearing user_organizations table...");
    await sequelize.query("DELETE FROM user_organizations;");
    console.log("   ✅ user_organizations cleared");

    // 2. Clear user_sessions (has FK to users)
    console.log("   📋 Clearing user_sessions table...");
    await sequelize.query("DELETE FROM user_sessions;");
    console.log("   ✅ user_sessions cleared");

    // 3. Clear users table
    console.log("   📋 Clearing users table...");
    await sequelize.query("DELETE FROM users;");
    console.log("   ✅ users cleared");

    // 4. Clear organizations table
    console.log("   📋 Clearing organizations table...");
    await sequelize.query("DELETE FROM organizations;");
    console.log("   ✅ organizations cleared");

    // 5. Optional: Reset sequences (auto-increment counters)
    console.log("\n🔄 Resetting ID sequences...");
    try {
      await sequelize.query("ALTER SEQUENCE users_id_seq RESTART WITH 1;");
      await sequelize.query(
        "ALTER SEQUENCE organizations_id_seq RESTART WITH 1;"
      );
      await sequelize.query(
        "ALTER SEQUENCE user_organizations_id_seq RESTART WITH 1;"
      );
      await sequelize.query(
        "ALTER SEQUENCE user_sessions_id_seq RESTART WITH 1;"
      );
      console.log("   ✅ Sequences reset");
    } catch (seqError) {
      console.log(
        "   ⚠️  Note: Some sequences may not exist yet (this is normal)"
      );
    }

    console.log("\n🎉 All authentication tables cleared successfully!");
    console.log("📊 Tables cleared:");
    console.log("   - users");
    console.log("   - organizations");
    console.log("   - user_organizations");
    console.log("   - user_sessions");
  } catch (error) {
    console.error("❌ Error clearing tables:", error.message);

    if (
      error.message.includes("relation") &&
      error.message.includes("does not exist")
    ) {
      console.log("\n💡 It looks like some tables don't exist yet.");
      console.log("   This is normal if you haven't run the migration yet.");
      console.log("   Run this command to create tables first:");
      console.log("   node scripts/migrate-to-config-system.js");                                                                                                                                                                                                       
    }
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Enhanced version that also shows table counts before and after
async function clearAuthTablesWithCounts() {
  try {
    console.log("🔌 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Show counts before clearing
    console.log("\n📊 Current table counts:");
    const tableNames = [
      "users",
      "organizations",
      "user_organizations",
      "user_sessions",
    ];

    for (const table of tableNames) {
      try {
        const [results] = await sequelize.query(
          `SELECT COUNT(*) as count FROM ${table};`
        );
        console.log(`   ${table}: ${results[0].count} records`);
      } catch (err) {
        console.log(`   ${table}: table not found`);
      }
    }

    // Clear tables
    console.log("\n🗑️  Clearing authentication tables...");

    // Clear in order
    const clearOrder = [
      "user_organizations",
      "user_sessions",
      "users",
      "organizations",
    ];

    for (const table of clearOrder) {
      try {
        console.log(`   📋 Clearing ${table} table...`);
        await sequelize.query(`DELETE FROM ${table};`);
        console.log(`   ✅ ${table} cleared`);
      } catch (err) {
        console.log(`   ⚠️  ${table}: ${err.message}`);
      }
    }

    // Reset sequences
    console.log("\n🔄 Resetting ID sequences...");
    const sequences = [
      "users_id_seq",
      "organizations_id_seq",
      "user_organizations_id_seq",
      "user_sessions_id_seq",
    ];

    for (const seq of sequences) {
      try {
        await sequelize.query(`ALTER SEQUENCE ${seq} RESTART WITH 1;`);
        console.log(`   ✅ ${seq} reset`);
      } catch (err) {
        console.log(`   ⚠️  ${seq}: not found (normal if tables are new)`);
      }
    }

    // Show counts after clearing
    console.log("\n📊 Final table counts:");
    for (const table of tableNames) {
      try {
        const [results] = await sequelize.query(
          `SELECT COUNT(*) as count FROM ${table};`
        );
        console.log(`   ${table}: ${results[0].count} records`);
      } catch (err) {
        console.log(`   ${table}: table not found`);
      }
    }

    console.log("\n🎉 All authentication tables cleared successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the script
if (require.main === module) {
  const showCounts = process.argv.includes("--counts");

  if (showCounts) {
    clearAuthTablesWithCounts();
  } else {
    clearAuthTables();
  }
}

module.exports = { clearAuthTables, clearAuthTablesWithCounts };

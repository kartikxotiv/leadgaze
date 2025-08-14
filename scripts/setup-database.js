const { execSync } = require("child_process");

async function setupDatabase() {
  try {
    console.log("🚀 Setting up CRM Database with Multi-Organization Tables...");

    // Import and run database sync
    const { syncDatabase, testConnection } = require("../lib/database-sync.ts");

    // Test connection first
    await testConnection();

    // Ask user if they want to reset the database
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question(
        "Do you want to reset the database and create all new tables? (y/N): ",
        resolve
      );
    });

    rl.close();

    const shouldReset =
      answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";

    if (shouldReset) {
      console.log("🗑️  Resetting database and creating all tables...");
    } else {
      console.log("📝 Creating new tables (keeping existing data)...");
    }

    // Sync database with all models
    await syncDatabase(shouldReset);

    console.log("✅ Database setup completed!");
    console.log("\n📋 New tables created:");
    console.log("  - organizations");
    console.log("  - user_organizations");
    console.log("  - organization_workspaces");
    console.log("  - user_invitations");
    console.log("  - user_sessions");
    console.log("\n📋 Next steps:");
    console.log("1. Start your Next.js development server: npm run dev");
    console.log("2. Open pgAdmin to view your database tables");
    console.log("3. Access the CRM at http://localhost:3000");
    console.log("4. Test the new multi-organization signup flow");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();

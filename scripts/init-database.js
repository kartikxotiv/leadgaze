const { execSync } = require("child_process")

async function initDatabase() {
  try {
    console.log("🚀 Initializing CRM Database...")

    // Import and run database sync
    const { syncDatabase, testConnection } = require("../lib/database-sync.ts")

    // Test connection first
    await testConnection()

    // Ask user if they want to reset the database
    const readline = require("readline")
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const answer = await new Promise((resolve) => {
      rl.question("Do you want to reset the database and seed with sample data? (y/N): ", resolve)
    })

    rl.close()

    const shouldReset = answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"

    // Sync database
    await syncDatabase(shouldReset)

    console.log("✅ Database initialization completed!")
    console.log("\n📋 Next steps:")
    console.log("1. Start your Next.js development server: npm run dev")
    console.log("2. Open pgAdmin to view your database tables")
    console.log(`3. Access the CRM at ${process.env.APP_URL}`)
  } catch (error) {
    console.error("❌ Database initialization failed:", error)
    process.exit(1)
  }
}

initDatabase()

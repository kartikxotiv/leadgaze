

const { Deal, Activity, Task } = require("../models");

async function main() {
  try {
    console.log("\n🔄 Syncing CRM tables (no force, no alter)...\n");

    console.log("➡️  deals ...");
    await Deal.sync();
    console.log("✅ deals ready");

    console.log("➡️  activities ...");
    await Activity.sync();
    console.log("✅ activities ready");

    console.log("➡️  tasks ...");
    await Task.sync();
    console.log("✅ tasks ready\n");

    console.log("🎉 Done");
  } catch (err) {
    console.error("❌ Sync error:", err);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

main();

const { Deal } = require("../models");

async function syncDealsTable() {
  try {
    console.log("🔄 Syncing deals table...");

    // Force sync the Deal table
    await Deal.sync({ force: true });

    console.log("✅ Deals table synced successfully");

    // Create a sample deal for testing
    const sampleDeal = await Deal.create({
      title: "Sample Deal",
      description: "Test deal for verification",
      dealValue: 10000,
      currency: "USD",
      stage: "qualification",
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      leadId: "cad9aa3b-9387-4c71-bba3-a8e449093930", // Use existing lead ID
      userId: "7c526086-2137-4067-a25c-e7b142fd7bd9", // Use existing user ID
      organizationId: "cbc2d399-01bf-430d-abbb-d63e1f6ab671",
    });

    console.log("✅ Sample deal created:", sampleDeal.dealId);
  } catch (error) {
    console.error("❌ Error syncing deals table:", error);
  }

  process.exit(0);
}

syncDealsTable();

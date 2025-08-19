const { Sequelize } = require("sequelize");
const path = require("path");
const fs = require("fs");

// Database configuration - using the same config as lib/database.ts
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: console.log,
});

async function fixLeadsSchema() {
  try {
    console.log("🔧 Fixing Leads Schema...");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Add meta_data column to leads table if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE leads 
        ADD COLUMN IF NOT EXISTS meta_data JSONB;
      `);
      console.log("✅ Added meta_data column to leads table");
    } catch (error) {
      console.log("ℹ️ meta_data column might already exist:", error.message);
    }

    // Add display_order column to leads_config table if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE leads_config 
        ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
      `);
      console.log("✅ Added display_order column to leads_config table");
    } catch (error) {
      console.log(
        "ℹ️ display_order column might already exist:",
        error.message
      );
    }

    // Add description column to leads_config table if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE leads_config 
        ADD COLUMN IF NOT EXISTS description TEXT;
      `);
      console.log("✅ Added description column to leads_config table");
    } catch (error) {
      console.log("ℹ️ description column might already exist:", error.message);
    }

    // Add metadata column to leads_config table if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE leads_config 
        ADD COLUMN IF NOT EXISTS metadata JSONB;
      `);
      console.log("✅ Added metadata column to leads_config table");
    } catch (error) {
      console.log("ℹ️ metadata column might already exist:", error.message);
    }

    // Update display_order for existing records
    try {
      await sequelize.query(`
        UPDATE leads_config 
        SET display_order = CASE 
          WHEN entity_type = 'status' THEN 
            CASE entity_value
              WHEN 'New' THEN 1
              WHEN 'Contacted' THEN 2
              WHEN 'Qualified' THEN 3
              WHEN 'Proposal' THEN 4
              WHEN 'Negotiation' THEN 5
              WHEN 'Closed Won' THEN 6
              WHEN 'Closed Lost' THEN 7
              ELSE 10
            END
          WHEN entity_type = 'source' THEN 
            CASE entity_value
              WHEN 'Website' THEN 1
              WHEN 'LinkedIn' THEN 2
              WHEN 'Referral' THEN 3
              WHEN 'Cold Call' THEN 4
              WHEN 'Email' THEN 5
              WHEN 'Trade Show' THEN 6
              WHEN 'Advertisement' THEN 7
              ELSE 10
            END
          WHEN entity_type = 'company_size' THEN 
            CASE entity_value
              WHEN '1-10' THEN 1
              WHEN '11-50' THEN 2
              WHEN '51-200' THEN 3
              WHEN '201-500' THEN 4
              WHEN '501-1000' THEN 5
              WHEN '1000+' THEN 6
              ELSE 10
            END
          ELSE 5
        END
        WHERE display_order IS NULL OR display_order = 0;
      `);
      console.log("✅ Updated display_order for existing records");
    } catch (error) {
      console.log("⚠️ Could not update display_order:", error.message);
    }

    console.log("🎉 Leads schema fix completed successfully!");
  } catch (error) {
    console.error("❌ Error fixing leads schema:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Check if this script is being run directly
if (require.main === module) {
  fixLeadsSchema()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { fixLeadsSchema };

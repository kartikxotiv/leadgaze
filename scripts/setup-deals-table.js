const { Sequelize } = require("sequelize");

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || "crm",
  process.env.DB_USER || "sidharthverma",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: "postgresql",
    logging: console.log,
  }
);

async function setupDealsTable() {
  try {
    console.log("🔧 Setting up Deals Table...");
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Drop existing table if it exists to recreate with new structure
    await sequelize.query(`DROP TABLE IF EXISTS deals CASCADE;`);
    console.log("✅ Dropped existing deals table");

    // Create deals table
    await sequelize.query(`
      CREATE TABLE deals (
        deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL REFERENCES leads(lead_id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        value DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (value >= 0),
        currency VARCHAR(3) NOT NULL DEFAULT 'USD' CHECK (LENGTH(currency) = 3),
        stage VARCHAR(20) NOT NULL DEFAULT 'qualification' CHECK (stage IN (
          'qualification', 'proposal', 'negotiation', 'decision', 'closed_won', 'closed_lost'
        )),
        probability INTEGER NOT NULL DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
        source VARCHAR(100),
        priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        expected_close_date DATE,
        actual_close_date DATE,
        lost_reason VARCHAR(255),
        user_id UUID NOT NULL REFERENCES users(user_id),
        organization_id UUID NOT NULL REFERENCES organizations(organization_id),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("✅ Created deals table");

    // Create indexes for performance
    await sequelize.query(`
      CREATE INDEX idx_deals_user_id ON deals(user_id);
      CREATE INDEX idx_deals_organization_id ON deals(organization_id);
      CREATE INDEX idx_deals_lead_id ON deals(lead_id);
      CREATE INDEX idx_deals_stage ON deals(stage);
      CREATE INDEX idx_deals_expected_close ON deals(expected_close_date);
      CREATE INDEX idx_deals_created ON deals(created_at);
      CREATE INDEX idx_deals_value ON deals(value);
    `);
    console.log("✅ Created performance indexes");

    // Insert sample deals for testing
    await sequelize.query(`
      INSERT INTO deals (
        lead_id, title, description, value, stage, probability, priority, 
        expected_close_date, user_id, organization_id
      ) 
      SELECT 
        l.lead_id,
        'Software License Deal - ' || COALESCE(l.business_name, l.first_name || ' ' || l.last_name) as title,
        'Enterprise software licensing opportunity with potential for annual subscription.' as description,
        25000 + (RANDOM() * 75000)::INTEGER as value,
        'qualification' as stage,
        20 as probability,
        'medium' as priority,
        NOW() + INTERVAL '30 days' + (RANDOM() * INTERVAL '90 days') as expected_close_date,
        l.created_by as user_id,
        l.organization_id
      FROM leads l 
      LIMIT 3;
    `);

    await sequelize.query(`
      INSERT INTO deals (
        lead_id, title, description, value, stage, probability, priority, 
        expected_close_date, user_id, organization_id
      ) 
      SELECT 
        l.lead_id,
        'Consulting Services - ' || COALESCE(l.business_name, l.first_name || ' ' || l.last_name) as title,
        'Professional services engagement for implementation and training.' as description,
        75000 + (RANDOM() * 125000)::INTEGER as value,
        'proposal' as stage,
        40 as probability,
        'high' as priority,
        NOW() + INTERVAL '45 days' + (RANDOM() * INTERVAL '60 days') as expected_close_date,
        l.created_by as user_id,
        l.organization_id
      FROM leads l 
      LIMIT 2;
    `);

    await sequelize.query(`
      INSERT INTO deals (
        lead_id, title, description, value, stage, probability, priority, 
        expected_close_date, user_id, organization_id
      ) 
      SELECT 
        l.lead_id,
        'Negotiation Deal - ' || COALESCE(l.business_name, l.first_name || ' ' || l.last_name) as title,
        'Advanced negotiations for enterprise contract.' as description,
        150000 + (RANDOM() * 200000)::INTEGER as value,
        'negotiation' as stage,
        70 as probability,
        'high' as priority,
        NOW() + INTERVAL '15 days' + (RANDOM() * INTERVAL '30 days') as expected_close_date,
        l.created_by as user_id,
        l.organization_id
      FROM leads l 
      LIMIT 2;
    `);

    await sequelize.query(`
      INSERT INTO deals (
        lead_id, title, description, value, stage, probability, priority, 
        expected_close_date, actual_close_date, user_id, organization_id
      ) 
      SELECT 
        l.lead_id,
        'Enterprise Platform - ' || COALESCE(l.business_name, l.first_name || ' ' || l.last_name) as title,
        'Full platform implementation with 3-year support contract.' as description,
        200000 + (RANDOM() * 300000)::INTEGER as value,
        'closed_won' as stage,
        100 as probability,
        'urgent' as priority,
        NOW() - INTERVAL '15 days' as expected_close_date,
        NOW() - INTERVAL '5 days' as actual_close_date,
        l.created_by as user_id,
        l.organization_id
      FROM leads l 
      LIMIT 1;
    `);

    console.log("✅ Inserted sample deals for testing");

    console.log("🎉 Deals table setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up deals table:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the setup
if (require.main === module) {
  setupDealsTable()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { setupDealsTable };

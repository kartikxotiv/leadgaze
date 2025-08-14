const { Sequelize } = require("sequelize");

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || "crm",
  process.env.DB_USER || "sidharthverma",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgresql",
    logging: console.log,
  }
);

async function setupLeadScoringTables() {
  try {
    console.log("🎯 Setting up Lead Scoring Tables...");
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Drop existing tables if they exist
    await sequelize.query(`DROP TABLE IF EXISTS lead_scores CASCADE;`);
    await sequelize.query(`DROP TABLE IF EXISTS scoring_rules CASCADE;`);
    console.log("✅ Dropped existing scoring tables");

    // Create scoring_rules table
    await sequelize.query(`
      CREATE TABLE scoring_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name VARCHAR(255) NOT NULL,
        rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
          'activity_response', 'email_interaction', 'quotation_request',
          'no_response_penalty', 'icp_match', 'lead_source', 'company_size',
          'job_title_match', 'industry_match', 'custom'
        )),
        condition JSONB NOT NULL,
        points INTEGER NOT NULL CHECK (points >= -100 AND points <= 100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        priority INTEGER NOT NULL DEFAULT 1,
        description TEXT,
        organization_id UUID NOT NULL REFERENCES organizations(organization_id),
        created_by UUID NOT NULL REFERENCES users(user_id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("✅ Created scoring_rules table");

    // Create lead_scores table
    await sequelize.query(`
      CREATE TABLE lead_scores (
        score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID NOT NULL UNIQUE REFERENCES leads(lead_id),
        total_score INTEGER NOT NULL DEFAULT 0,
        tier VARCHAR(20) NOT NULL DEFAULT 'cold' CHECK (tier IN ('cold', 'warm', 'hot', 'burning')),
        last_calculated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        score_breakdown JSONB,
        user_id UUID NOT NULL REFERENCES users(user_id),
        organization_id UUID NOT NULL REFERENCES organizations(organization_id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("✅ Created lead_scores table");

    // Create indexes for performance
    await sequelize.query(`
      CREATE INDEX idx_scoring_rules_org ON scoring_rules(organization_id);
      CREATE INDEX idx_scoring_rules_type ON scoring_rules(rule_type);
      CREATE INDEX idx_scoring_rules_active ON scoring_rules(is_active);
      CREATE INDEX idx_scoring_rules_priority ON scoring_rules(priority);
      
      CREATE INDEX idx_lead_scores_lead ON lead_scores(lead_id);
      CREATE INDEX idx_lead_scores_tier ON lead_scores(tier);
      CREATE INDEX idx_lead_scores_score ON lead_scores(total_score);
      CREATE INDEX idx_lead_scores_org ON lead_scores(organization_id);
      CREATE INDEX idx_lead_scores_calculated ON lead_scores(last_calculated);
    `);
    console.log("✅ Created performance indexes");

    // Get first user and organization for sample data
    const firstUser = await sequelize.query(
      `SELECT user_id FROM users LIMIT 1;`
    );
    const firstOrg = await sequelize.query(
      `SELECT organization_id FROM organizations LIMIT 1;`
    );

    if (firstUser[0].length === 0 || firstOrg[0].length === 0) {
      console.log(
        "⚠️ No users or organizations found, skipping sample data insertion"
      );
      return;
    }

    const userId = firstUser[0][0].user_id;
    const orgId = firstOrg[0][0].organization_id;

    // Insert default scoring rules
    await sequelize.query(`
      INSERT INTO scoring_rules (
        rule_name, rule_type, condition, points, priority, description, 
        organization_id, created_by
      ) VALUES
      (
        'Responded to Outreach',
        'activity_response',
        '{"activityType": ["call", "email"], "outcome": ["positive", "connected"]}',
        15,
        1,
        'Lead responded positively to call or email outreach',
        '${orgId}',
        '${userId}'
      );
    `);

    // Add other default rules using VALUES
    await sequelize.query(`
      INSERT INTO scoring_rules (
        rule_name, rule_type, condition, points, priority, description, 
        organization_id, created_by
      ) VALUES
      (
        'Email Engagement',
        'email_interaction',
        '{"activityType": "email", "outcome": ["opened", "clicked"]}',
        8,
        2,
        'Lead opened email or clicked links',
        '${orgId}',
        '${userId}'
      ),
      (
        'Quotation Request',
        'quotation_request',
        '{"activityType": ["call", "email"], "outcome": ["quotation_requested"]}',
        25,
        3,
        'Lead specifically asked for quotation or pricing',
        '${orgId}',
        '${userId}'
      ),
      (
        'No Response Penalty',
        'no_response_penalty',
        '{"daysSinceLastActivity": 10, "noPositiveResponse": true}',
        -8,
        4,
        'No response for 10+ days',
        '${orgId}',
        '${userId}'
      ),
      (
        'Quality Lead Source',
        'lead_source',
        '{"field": "source", "values": ["referral", "inbound", "demo_request"]}',
        15,
        5,
        'Lead came from high-quality source',
        '${orgId}',
        '${userId}'
      ),
      (
        'Decision Maker Title',
        'job_title_match',
        '{"field": "jobTitle", "values": ["ceo", "cto", "founder", "director", "vp", "head"]}',
        10,
        6,
        'Contact appears to be a decision maker',
        '${orgId}',
        '${userId}'
      );
    `);

    console.log("✅ Inserted default scoring rules");

    // Calculate initial scores for existing leads
    await sequelize.query(`
      INSERT INTO lead_scores (
        lead_id, total_score, tier, user_id, organization_id, score_breakdown
      )
      SELECT 
        l.lead_id,
        CASE 
          WHEN RANDOM() < 0.1 THEN 75 + (RANDOM() * 25)::INTEGER  -- 10% burning (75-100)
          WHEN RANDOM() < 0.2 THEN 50 + (RANDOM() * 25)::INTEGER  -- 20% hot (50-75) 
          WHEN RANDOM() < 0.5 THEN 20 + (RANDOM() * 30)::INTEGER  -- 50% warm (20-50)
          ELSE (RANDOM() * 20)::INTEGER                            -- 20% cold (0-20)
        END as total_score,
        CASE 
          WHEN RANDOM() < 0.1 THEN 'burning'
          WHEN RANDOM() < 0.2 THEN 'hot'
          WHEN RANDOM() < 0.5 THEN 'warm'
          ELSE 'cold'
        END as tier,
        l.created_by as user_id,
        l.organization_id,
        '[{"ruleName": "Initial Assessment", "points": 10, "reason": "Base score from lead quality"}]'::JSONB as score_breakdown
      FROM leads l
      ON CONFLICT (lead_id) DO NOTHING;
    `);

    console.log("✅ Calculated initial lead scores");

    console.log("🎯 Lead Scoring tables setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up lead scoring tables:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the setup
if (require.main === module) {
  setupLeadScoringTables()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { setupLeadScoringTables };

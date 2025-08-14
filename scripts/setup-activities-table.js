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

async function setupActivitiesTable() {
  try {
    console.log("🔧 Setting up Activities Table...");
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Drop existing table if it exists to recreate with new structure
    await sequelize.query(`DROP TABLE IF EXISTS activities CASCADE;`);
    console.log("✅ Dropped existing activities table");

    // Create activities table with enhanced structure
    await sequelize.query(`
      CREATE TABLE activities (
        activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
          'call', 'email', 'linkedin', 'meeting', 'task', 'note', 'demo',
          'proposal_sent', 'lead_created', 'lead_updated', 'status_changed',
          'score_updated', 'deal_created', 'deal_moved', 'task_created',
          'task_completed', 'follow_up_scheduled'
        )),
        related_type VARCHAR(20) NOT NULL CHECK (related_type IN ('lead', 'deal', 'contact', 'company')),
        related_id UUID NOT NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        outcome VARCHAR(100),
        direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
        duration_minutes INTEGER CHECK (duration_minutes >= 0),
        scheduled_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        due_date TIMESTAMP WITH TIME ZONE,
        priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        user_id UUID NOT NULL REFERENCES users(user_id),
        next_followup_date TIMESTAMP WITH TIME ZONE,
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_type VARCHAR(50),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("✅ Created activities table with enhanced structure");

    // Create indexes for performance
    await sequelize.query(`
      CREATE INDEX idx_activities_user_id ON activities(user_id);
      CREATE INDEX idx_activities_related ON activities(related_type, related_id);
      CREATE INDEX idx_activities_type ON activities(activity_type);
      CREATE INDEX idx_activities_scheduled ON activities(scheduled_at);
      CREATE INDEX idx_activities_due ON activities(due_date);
      CREATE INDEX idx_activities_created ON activities(created_at);
      CREATE INDEX idx_activities_followup ON activities(next_followup_date);
    `);
    console.log("✅ Created performance indexes");

    // Insert sample activities for testing
    await sequelize.query(`
      INSERT INTO activities (
        activity_type, related_type, related_id, subject, description, outcome,
        direction, duration_minutes, completed_at, priority, user_id
      ) 
      SELECT 
        'call' as activity_type,
        'lead' as related_type,
        l.lead_id as related_id,
        'Initial discovery call' as subject,
        'Discussed current CRM pain points and business needs. Prospect is interested in our solution.' as description,
        'Connected - Positive' as outcome,
        'outbound' as direction,
        25 as duration_minutes,
        NOW() - INTERVAL '2 days' as completed_at,
        'high' as priority,
        l.created_by as user_id
      FROM leads l 
      LIMIT 3;
    `);

    await sequelize.query(`
      INSERT INTO activities (
        activity_type, related_type, related_id, subject, description, outcome,
        completed_at, priority, user_id, next_followup_date
      ) 
      SELECT 
        'email' as activity_type,
        'lead' as related_type,
        l.lead_id as related_id,
        'Follow-up email sent' as subject,
        'Sent introduction email with company overview and next steps.' as description,
        'Sent - Awaiting Response' as outcome,
        NOW() - INTERVAL '1 day' as completed_at,
        'medium' as priority,
        l.created_by as user_id,
        NOW() + INTERVAL '3 days' as next_followup_date
      FROM leads l 
      LIMIT 2;
    `);

    await sequelize.query(`
      INSERT INTO activities (
        activity_type, related_type, related_id, subject, description,
        completed_at, priority, user_id
      ) 
      SELECT 
        'note' as activity_type,
        'lead' as related_type,
        l.lead_id as related_id,
        'Research notes' as subject,
        'Researched company background. They are a fast-growing tech startup in the fintech space with 50+ employees.' as description,
        NOW() - INTERVAL '3 hours' as completed_at,
        'low' as priority,
        l.created_by as user_id
      FROM leads l 
      LIMIT 1;
    `);

    console.log("✅ Inserted sample activities for testing");

    console.log("🎉 Activities table setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up activities table:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the setup
if (require.main === module) {
  setupActivitiesTable()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { setupActivitiesTable };

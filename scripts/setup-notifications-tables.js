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

async function setupNotificationsTables() {
  try {
    console.log("🔔 Setting up Notifications & Automation Tables...");
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");

    // Drop existing tables if they exist
    await sequelize.query(`DROP TABLE IF EXISTS notifications CASCADE;`);
    await sequelize.query(`DROP TABLE IF EXISTS automation_rules CASCADE;`);
    console.log("✅ Dropped existing tables");

    // Create notifications table
    await sequelize.query(`
      CREATE TABLE notifications (
        notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(user_id),
        type VARCHAR(50) NOT NULL CHECK (type IN (
          'lead_assigned', 'follow_up_due', 'lead_stale', 'lead_scored_high',
          'deal_moved', 'deal_stuck', 'task_overdue', 'activity_reminder',
          'system_update', 'bulk_import_complete', 'escalation'
        )),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        channel VARCHAR(20) NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'slack', 'sms')),
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        action_url VARCHAR(500),
        action_label VARCHAR(100),
        related_type VARCHAR(20) CHECK (related_type IN ('lead', 'deal', 'task', 'activity', 'user')),
        related_id UUID,
        organization_id UUID NOT NULL REFERENCES organizations(organization_id),
        sent_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("✅ Created notifications table");

    // Create automation_rules table
    await sequelize.query(`
      CREATE TABLE automation_rules (
        rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        trigger VARCHAR(50) NOT NULL CHECK (trigger IN (
          'lead_created', 'lead_updated', 'lead_score_changed', 'lead_stale',
          'deal_created', 'deal_moved', 'deal_stuck', 'task_created',
          'task_overdue', 'activity_logged', 'follow_up_due', 'time_based'
        )),
        conditions JSONB NOT NULL,
        actions JSONB NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        priority INTEGER NOT NULL DEFAULT 1,
        last_triggered TIMESTAMP WITH TIME ZONE,
        trigger_count INTEGER NOT NULL DEFAULT 0,
        organization_id UUID NOT NULL REFERENCES organizations(organization_id),
        created_by UUID NOT NULL REFERENCES users(user_id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("✅ Created automation_rules table");

    // Create indexes for performance
    await sequelize.query(`
      CREATE INDEX idx_notifications_user ON notifications(user_id);
      CREATE INDEX idx_notifications_org ON notifications(organization_id);
      CREATE INDEX idx_notifications_type ON notifications(type);
      CREATE INDEX idx_notifications_priority ON notifications(priority);
      CREATE INDEX idx_notifications_read ON notifications(is_read);
      CREATE INDEX idx_notifications_created ON notifications(created_at);
      CREATE INDEX idx_notifications_related ON notifications(related_type, related_id);
      CREATE INDEX idx_notifications_expires ON notifications(expires_at);
      
      CREATE INDEX idx_automation_rules_org ON automation_rules(organization_id);
      CREATE INDEX idx_automation_rules_trigger ON automation_rules(trigger);
      CREATE INDEX idx_automation_rules_active ON automation_rules(is_active);
      CREATE INDEX idx_automation_rules_priority ON automation_rules(priority);
      CREATE INDEX idx_automation_rules_triggered ON automation_rules(last_triggered);
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

    // Insert sample notifications
    await sequelize.query(`
      INSERT INTO notifications (
        user_id, type, title, message, priority, channel, 
        action_url, action_label, organization_id, sent_at
      ) VALUES
      (
        '${userId}',
        'lead_scored_high',
        '🔥 High-Value Lead Alert',
        'John Doe scored 85 points - high conversion potential!',
        'high',
        'in_app',
        '/pages/leads/sample',
        'View Lead',
        '${orgId}',
        NOW()
      ),
      (
        '${userId}',
        'follow_up_due',
        '📅 Follow-up Due Today', 
        'Follow-up scheduled for Jane Smith is due today',
        'urgent',
        'in_app',
        '/pages/leads/sample',
        'Complete Follow-up',
        '${orgId}',
        NOW() - INTERVAL '2 hours'
      ),
      (
        '${userId}',
        'deal_moved',
        '📊 Deal Progress',
        'Acme Corp deal moved to Negotiation stage',
        'medium',
        'in_app',
        '/deals/sample',
        'View Deal',
        '${orgId}',
        NOW() - INTERVAL '1 day'
      ),
      (
        '${userId}',
        'bulk_import_complete',
        '📥 Import Complete',
        'Successfully imported 45 leads from CSV file',
        'medium',
        'in_app',
        '/pages/leads',
        'View Leads',
        '${orgId}',
        NOW() - INTERVAL '3 hours'
      ),
      (
        '${userId}',
        'lead_stale',
        '⏰ Lead Needs Attention',
        'Lead Mike Johnson hasn''t been contacted in 7 days',
        'medium',
        'in_app',
        '/pages/leads/sample',
        'Contact Lead',
        '${orgId}',
        NOW() - INTERVAL '6 hours'
      );
    `);
    console.log("✅ Inserted sample notifications");

    // Insert default automation rules
    await sequelize.query(`
      INSERT INTO automation_rules (
        name, description, trigger, conditions, actions, 
        organization_id, created_by, priority
      ) VALUES
      (
        'High Score Lead Alert',
        'Notify when a lead scores 60 or higher',
        'lead_score_changed',
        '{"score": {"gte": 60}}',
        '[{"type": "notification", "target": "assigned_user", "template": "high_score_lead", "priority": "high"}]',
        '${orgId}',
        '${userId}',
        1
      ),
      (
        'Stale Lead Reminder',
        'Notify when a lead hasn''t been contacted in 7 days',
        'lead_stale',
        '{"daysSinceLastActivity": {"gte": 7}, "status": {"neq": "qualified"}}',
        '[{"type": "notification", "target": "assigned_user", "template": "stale_lead_reminder", "priority": "medium"}]',
        '${orgId}',
        '${userId}',
        2
      ),
      (
        'Deal Stuck Alert',
        'Alert when deal stays in same stage for 14+ days',
        'deal_stuck',
        '{"daysInStage": {"gte": 14}, "stage": {"nin": ["closed_won", "closed_lost"]}}',
        '[{"type": "notification", "target": "assigned_user", "template": "deal_stuck_alert", "priority": "high"}, {"type": "notification", "target": "manager", "template": "deal_stuck_manager", "priority": "medium"}]',
        '${orgId}',
        '${userId}',
        3
      ),
      (
        'Follow-up Due Reminder',
        'Daily reminder for due follow-ups',
        'follow_up_due',
        '{"dueDate": {"eq": "today"}}',
        '[{"type": "notification", "target": "assigned_user", "template": "follow_up_due", "priority": "high"}]',
        '${orgId}',
        '${userId}',
        4
      ),
      (
        'New Lead Assignment',
        'Notify user when a lead is assigned to them',
        'lead_created',
        '{"assignedTo": {"exists": true}}',
        '[{"type": "notification", "target": "assigned_user", "template": "lead_assigned", "priority": "medium"}]',
        '${orgId}',
        '${userId}',
        5
      );
    `);
    console.log("✅ Inserted default automation rules");

    console.log(
      "🔔 Notifications & Automation tables setup completed successfully!"
    );
  } catch (error) {
    console.error("❌ Error setting up notifications tables:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the setup
if (require.main === module) {
  setupNotificationsTables()
    .then(() => {
      console.log("✅ Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = { setupNotificationsTables };

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Activities indexes
    await queryInterface.addIndex('activities', ['created_at'], { name: 'activities_created_idx' });
    await queryInterface.addIndex('activities', ['due_date'], { name: 'activities_due_idx' });
    await queryInterface.addIndex('activities', ['related_type', 'related_id'], { name: 'activities_related_idx' });
    await queryInterface.addIndex('activities', ['scheduled_at'], { name: 'activities_sched_idx' });
    await queryInterface.addIndex('activities', ['activity_type'], { name: 'activities_type_idx' });
    await queryInterface.addIndex('activities', ['user_id'], { name: 'activities_user_id_idx' });

    // Deals indexes
    await queryInterface.addIndex('deals', ['created_at'], { name: 'deals_created_at_idx' });
    await queryInterface.addIndex('deals', ['expected_close_date'], { name: 'deals_expected_close_date_idx' });
    await queryInterface.addIndex('deals', ['lead_id'], { name: 'deals_lead_id_idx' });
    await queryInterface.addIndex('deals', ['organization_id'], { name: 'deals_organization_id_idx' });
    await queryInterface.addIndex('deals', ['stage'], { name: 'deals_stage_idx' });
    await queryInterface.addIndex('deals', ['user_id'], { name: 'deals_user_id_idx' });

    // Email OTPs indexes
    await queryInterface.addIndex('email_otps', ['email'], { name: 'email_otps_email' });
    await queryInterface.addIndex('email_otps', ['email', 'otp', 'purpose'], { 
      name: 'email_otps_email_otp_purpose', 
      unique: true 
    });
    await queryInterface.addIndex('email_otps', ['email', 'purpose'], { name: 'email_otps_email_purpose' });
    await queryInterface.addIndex('email_otps', ['expires_at'], { name: 'email_otps_expires_at' });

    // Automation rules indexes
    await queryInterface.addIndex('automation_rules', ['is_active'], { name: 'idx_automation_rules_active' });
    await queryInterface.addIndex('automation_rules', ['organization_id'], { name: 'idx_automation_rules_org' });
    await queryInterface.addIndex('automation_rules', ['priority'], { name: 'idx_automation_rules_priority' });
    await queryInterface.addIndex('automation_rules', ['trigger'], { name: 'idx_automation_rules_trigger' });
    await queryInterface.addIndex('automation_rules', ['last_triggered'], { name: 'idx_automation_rules_triggered' });

    // Lead scores indexes
    await queryInterface.addIndex('lead_scores', ['last_calculated'], { name: 'idx_lead_scores_calculated' });
    await queryInterface.addIndex('lead_scores', ['lead_id'], { name: 'idx_lead_scores_lead' });
    await queryInterface.addIndex('lead_scores', ['organization_id'], { name: 'idx_lead_scores_org' });
    await queryInterface.addIndex('lead_scores', ['total_score'], { name: 'idx_lead_scores_score' });
    await queryInterface.addIndex('lead_scores', ['tier'], { name: 'idx_lead_scores_tier' });

    // Notifications indexes
    await queryInterface.addIndex('notifications', ['created_at'], { name: 'idx_notifications_created' });
    await queryInterface.addIndex('notifications', ['expires_at'], { name: 'idx_notifications_expires' });
    await queryInterface.addIndex('notifications', ['organization_id'], { name: 'idx_notifications_org' });
    await queryInterface.addIndex('notifications', ['priority'], { name: 'idx_notifications_priority' });
    await queryInterface.addIndex('notifications', ['is_read'], { name: 'idx_notifications_read' });
    await queryInterface.addIndex('notifications', ['related_type', 'related_id'], { name: 'idx_notifications_related' });
    await queryInterface.addIndex('notifications', ['type'], { name: 'idx_notifications_type' });
    await queryInterface.addIndex('notifications', ['user_id'], { name: 'idx_notifications_user' });

    // Org user accounts indexes
    await queryInterface.addIndex('org_user_accounts', ['email'], { name: 'idx_org_user_accounts_email' });
    await queryInterface.addIndex('org_user_accounts', ['organization_id'], { name: 'idx_org_user_accounts_org' });

    // Scoring rules indexes
    await queryInterface.addIndex('scoring_rules', ['is_active'], { name: 'idx_scoring_rules_active' });
    await queryInterface.addIndex('scoring_rules', ['organization_id'], { name: 'idx_scoring_rules_org' });
    await queryInterface.addIndex('scoring_rules', ['priority'], { name: 'idx_scoring_rules_priority' });
    await queryInterface.addIndex('scoring_rules', ['rule_type'], { name: 'idx_scoring_rules_type' });

    // Leads indexes
    await queryInterface.addIndex('leads', ['assigned_to'], { name: 'leads_assigned_to_idx' });
    await queryInterface.addIndex('leads', ['created_at'], { name: 'leads_created_at_idx' });
    await queryInterface.addIndex('leads', ['created_by'], { name: 'leads_created_by_idx' });
    await queryInterface.addIndex('leads', ['email'], { name: 'leads_email_idx' });
    await queryInterface.addIndex('leads', ['industry_id'], { name: 'leads_industry_id_idx' });
    await queryInterface.addIndex('leads', ['lead_score'], { name: 'leads_lead_score_idx' });
    await queryInterface.addIndex('leads', ['next_followup_date'], { name: 'leads_next_followup_idx' });
    await queryInterface.addIndex('leads', ['organization_id'], { name: 'leads_org_idx' });
    await queryInterface.addIndex('leads', ['score_grade_id'], { name: 'leads_score_grade_id_idx' });
    await queryInterface.addIndex('leads', ['source_id'], { name: 'leads_source_id_idx' });
    await queryInterface.addIndex('leads', ['status_id'], { name: 'leads_status_id_idx' });

    // Leads config indexes
    await queryInterface.addIndex('leads_config', ['display_order'], { name: 'leads_config_display_order' });
    await queryInterface.addIndex('leads_config', ['entity_type'], { name: 'leads_config_entity_type' });
    await queryInterface.addIndex('leads_config', ['is_active'], { name: 'leads_config_is_active' });

    // Password reset tokens indexes
    await queryInterface.addIndex('password_reset_tokens', ['expires_at'], { name: 'prt_expires_at_idx' });
    await queryInterface.addIndex('password_reset_tokens', ['token'], { name: 'prt_token_uq', unique: true });
    await queryInterface.addIndex('password_reset_tokens', ['user_id'], { name: 'prt_user_id_idx' });

    // Tasks indexes
    await queryInterface.addIndex('tasks', ['assigned_to'], { name: 'tasks_assigned_to_idx' });
    await queryInterface.addIndex('tasks', ['deal_id'], { name: 'tasks_deal_id_idx' });
    await queryInterface.addIndex('tasks', ['due_date'], { name: 'tasks_due_date_idx' });
    await queryInterface.addIndex('tasks', ['lead_id'], { name: 'tasks_lead_id_idx' });
    await queryInterface.addIndex('tasks', ['priority'], { name: 'tasks_priority_idx' });
    await queryInterface.addIndex('tasks', ['status'], { name: 'tasks_status_idx' });
  },

  async down(queryInterface, Sequelize) {
    // Remove all indexes (Sequelize handles this automatically when dropping tables, but for safety)
    const indexes = [
      'activities_created_idx', 'activities_due_idx', 'activities_related_idx', 
      'activities_sched_idx', 'activities_type_idx', 'activities_user_id_idx',
      'deals_created_at_idx', 'deals_expected_close_date_idx', 'deals_lead_id_idx',
      'deals_organization_id_idx', 'deals_stage_idx', 'deals_user_id_idx',
      'email_otps_email', 'email_otps_email_otp_purpose', 'email_otps_email_purpose', 'email_otps_expires_at',
      'idx_automation_rules_active', 'idx_automation_rules_org', 'idx_automation_rules_priority',
      'idx_automation_rules_trigger', 'idx_automation_rules_triggered',
      'idx_lead_scores_calculated', 'idx_lead_scores_lead', 'idx_lead_scores_org', 
      'idx_lead_scores_score', 'idx_lead_scores_tier',
      'idx_notifications_created', 'idx_notifications_expires', 'idx_notifications_org',
      'idx_notifications_priority', 'idx_notifications_read', 'idx_notifications_related',
      'idx_notifications_type', 'idx_notifications_user',
      'idx_org_user_accounts_email', 'idx_org_user_accounts_org',
      'idx_scoring_rules_active', 'idx_scoring_rules_org', 'idx_scoring_rules_priority', 'idx_scoring_rules_type',
      'leads_assigned_to_idx', 'leads_created_at_idx', 'leads_created_by_idx', 'leads_email_idx',
      'leads_industry_id_idx', 'leads_lead_score_idx', 'leads_next_followup_idx', 'leads_org_idx',
      'leads_score_grade_id_idx', 'leads_source_id_idx', 'leads_status_id_idx',
      'leads_config_display_order', 'leads_config_entity_type', 'leads_config_is_active',
      'prt_expires_at_idx', 'prt_token_uq', 'prt_user_id_idx',
      'tasks_assigned_to_idx', 'tasks_deal_id_idx', 'tasks_due_date_idx', 
      'tasks_lead_id_idx', 'tasks_priority_idx', 'tasks_status_idx'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${indexName};`);
      } catch (error) {
        console.warn(`Could not drop index ${indexName}:`, error.message);
      }
    }
  }
}; 
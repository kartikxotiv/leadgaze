'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create pgcrypto extension
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // Create all ENUM types
    await queryInterface.sequelize.query(`
      CREATE TYPE activity_related_type AS ENUM (
        'lead', 'deal', 'contact', 'company'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE activity_type AS ENUM (
        'call', 'email', 'linkedin', 'meeting', 'task', 'note', 'demo',
        'proposal_sent', 'lead_created', 'lead_updated', 'status_changed',
        'score_updated', 'deal_created', 'deal_moved', 'task_created',
        'task_completed', 'follow_up_scheduled'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE deal_priority AS ENUM (
        'low', 'medium', 'high', 'urgent'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE deal_stage AS ENUM (
        'qualification', 'proposal', 'negotiation', 'decision',
        'closed_won', 'closed_lost'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_activities_outcome AS ENUM (
        'positive', 'neutral', 'negative', 'follow_up'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_activities_type AS ENUM (
        'call', 'email', 'meeting', 'note', 'task', 'deal_update'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_deals_deal_status AS ENUM (
        'open', 'won', 'lost', 'on_hold'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_deals_status AS ENUM (
        'open', 'won', 'lost', 'cancelled'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_email_otps_purpose AS ENUM (
        'signup', 'password_reset', 'login'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_leads_company_size AS ENUM (
        '1-10', '11-50', '51-200', '201-500', '500+'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_leads_priority AS ENUM (
        'High', 'Medium', 'Low'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_leads_source AS ENUM (
        'Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email', 'Trade Show', 'Advertisement'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_leads_status AS ENUM (
        'New', 'Contacted', 'Qualified', 'Converted', 'Disqualified'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_leads_type AS ENUM (
        'Hot', 'Warm', 'Cold'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_organizations_company_size AS ENUM (
        'solo', 'small', 'medium', 'large', 'enterprise'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_organizations_plan_type AS ENUM (
        'trial', 'basic', 'pro', 'enterprise'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_organizations_status AS ENUM (
        'active', 'inactive', 'suspended'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_organizations_subscription_status AS ENUM (
        'trial', 'active', 'cancelled', 'past_due', 'unpaid'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_tasks_priority AS ENUM (
        'Low', 'Medium', 'High', 'Urgent'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_tasks_status AS ENUM (
        'Pending', 'In Progress', 'Completed', 'Cancelled'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_tasks_type AS ENUM (
        'Call', 'Email', 'Meeting', 'Follow-up', 'Other'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_user_organizations_role AS ENUM (
        'owner', 'admin', 'manager', 'viewer'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_user_organizations_status AS ENUM (
        'active', 'inactive', 'pending'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE enum_users_status AS ENUM (
        'active', 'inactive', 'suspended'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE task_priority AS ENUM (
        'Low', 'Medium', 'High', 'Urgent'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE task_status AS ENUM (
        'Pending', 'In Progress', 'Completed', 'Cancelled'
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE task_type AS ENUM (
        'Task', 'Call', 'Email', 'Meeting', 'Note'
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop all ENUM types in reverse order
    const enums = [
      'task_type', 'task_status', 'task_priority', 'enum_users_status',
      'enum_user_organizations_status', 'enum_user_organizations_role',
      'enum_tasks_type', 'enum_tasks_status', 'enum_tasks_priority',
      'enum_organizations_subscription_status', 'enum_organizations_status',
      'enum_organizations_plan_type', 'enum_organizations_company_size',
      'enum_leads_type', 'enum_leads_status', 'enum_leads_source',
      'enum_leads_priority', 'enum_leads_company_size', 'enum_email_otps_purpose',
      'enum_deals_status', 'enum_deals_deal_status', 'enum_activities_type',
      'enum_activities_outcome', 'deal_stage', 'deal_priority',
      'activity_type', 'activity_related_type'
    ];

    for (const enumName of enums) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS ${enumName} CASCADE;`);
    }

    // Drop extension
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS pgcrypto;');
  }
}; 
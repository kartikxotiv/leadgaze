'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organizations', {
      organization_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      industry_type: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      company_size_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organization_config',
          key: 'id'
        }
      },
      primary_use_case: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      current_tool: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      website: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        }
      },
      status_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organization_config',
          key: 'id'
        }
      },
      subscription_status_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organization_config',
          key: 'id'
        }
      },
      plan_type_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organization_config',
          key: 'id'
        }
      },
      trial_starts_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      trial_ends_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      subscription_starts_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      subscription_ends_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      billing_email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      max_users: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
        allowNull: true
      },
      max_workspaces: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
        allowNull: true
      },
      max_storage_gb: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        allowNull: true
      },
      features_enabled: {
        type: Sequelize.JSONB,
        defaultValue: [],
        allowNull: true
      },
      settings: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      }
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove any remaining foreign key constraints that might reference organizations
    try {
      await queryInterface.sequelize.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_last_visited_organization_id_fkey;');
      await queryInterface.sequelize.query('ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_current_organization_id_fkey;');
      await queryInterface.sequelize.query('ALTER TABLE user_organizations DROP CONSTRAINT IF EXISTS user_organizations_organization_id_fkey;');
      await queryInterface.sequelize.query('ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_organization_id_fkey;');
      await queryInterface.sequelize.query('ALTER TABLE organization_workspaces DROP CONSTRAINT IF EXISTS organization_workspaces_organization_id_fkey;');
      await queryInterface.sequelize.query('ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_organization_id_fkey;');
      await queryInterface.sequelize.query('ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_organization_id_fkey;');
    } catch (error) {
      console.log('Some constraints may not exist, continuing with table drop:', error.message);
    }
    
    await queryInterface.dropTable('organizations');
  }
}; 
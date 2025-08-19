'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create tasks table
    await queryInterface.createTable('tasks', {
      task_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      type: {
        type: 'task_type',
        defaultValue: 'Task',
        allowNull: false
      },
      priority: {
        type: 'task_priority',
        defaultValue: 'Medium',
        allowNull: false
      },
      status: {
        type: 'task_status',
        defaultValue: 'Pending',
        allowNull: false
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lead_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'leads',
          key: 'lead_id'
        }
      },
      deal_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'deals',
          key: 'deal_id'
        }
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        }
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        }
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

    // Create lead_scores table
    await queryInterface.createTable('lead_scores', {
      score_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'leads',
          key: 'lead_id'
        }
      },
      total_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      tier: {
        type: Sequelize.STRING(20),
        defaultValue: 'cold',
        allowNull: false
      },
      last_calculated: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      },
      score_breakdown: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false
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

    // Add constraint to lead_scores
    await queryInterface.addConstraint('lead_scores', {
      fields: ['tier'],
      type: 'check',
      name: 'lead_scores_tier_check',
      where: {
        tier: {
          [Sequelize.Op.in]: ['cold', 'warm', 'hot', 'burning']
        }
      }
    });

    // Create notifications table
    await queryInterface.createTable('notifications', {
      notification_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      priority: {
        type: Sequelize.STRING(20),
        defaultValue: 'medium',
        allowNull: false
      },
      channel: {
        type: Sequelize.STRING(20),
        defaultValue: 'in_app',
        allowNull: false
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      action_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      action_label: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      related_type: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      related_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
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

    // Create automation_rules table
    await queryInterface.createTable('automation_rules', {
      rule_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      trigger: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      conditions: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      actions: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      last_triggered: {
        type: Sequelize.DATE,
        allowNull: true
      },
      trigger_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false
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

    // Create scoring_rules table
    await queryInterface.createTable('scoring_rules', {
      rule_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      rule_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      rule_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      condition: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      priority: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false
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

    // Create org_user_accounts table
    await queryInterface.createTable('org_user_accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'active',
        allowNull: false
      },
      last_login: {
        type: Sequelize.DATE,
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

    // Create organization_workspaces table
    await queryInterface.createTable('organization_workspaces', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'organization_id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organization_config',
          key: 'id'
        }
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        }
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

    // Add unique constraint to organization_workspaces
    await queryInterface.addConstraint('organization_workspaces', {
      fields: ['organization_id', 'slug'],
      type: 'unique',
      name: 'organization_workspaces_organization_id_slug_key'
    });

    // Add unique constraint to org_user_accounts
    await queryInterface.addConstraint('org_user_accounts', {
      fields: ['organization_id', 'email'],
      type: 'unique',
      name: 'org_user_accounts_org_email_unique'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('organization_workspaces');
    await queryInterface.dropTable('org_user_accounts');
    await queryInterface.dropTable('scoring_rules');
    await queryInterface.dropTable('automation_rules');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('lead_scores');
    await queryInterface.dropTable('tasks');
  }
}; 
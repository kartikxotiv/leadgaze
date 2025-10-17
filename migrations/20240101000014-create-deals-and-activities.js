'use strict';


module.exports = {
  async up(queryInterface, Sequelize) {
   
    await queryInterface.createTable('deals', {
      deal_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      lead_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'leads',
          key: 'lead_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      value: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0.00,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD',
        allowNull: false
      },
      stage: {
        type: 'deal_stage',
        defaultValue: 'qualification',
        allowNull: false
      },
      probability: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
        allowNull: false
      },
      source: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      priority: {
        type: 'deal_priority',
        defaultValue: 'medium',
        allowNull: false
      },
      expected_close_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      actual_close_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      lost_reason: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'organizations',
          key: 'organization_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

   
    await queryInterface.addConstraint('deals', {
      fields: ['probability'],
      type: 'check',
      name: 'deals_probability_check',
      where: {
        [Sequelize.Op.and]: [
          { probability: { [Sequelize.Op.gte]: 0 } },
          { probability: { [Sequelize.Op.lte]: 100 } }
        ]
      }
    });

   
    await queryInterface.createTable('activities', {
      activity_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      activity_type: {
        type: 'activity_type',
        allowNull: false
      },
      related_type: {
        type: 'activity_related_type',
        allowNull: false
      },
      related_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      outcome: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      direction: {
        type: Sequelize.STRING(8),
        allowNull: true
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      priority: {
        type: 'deal_priority',
        defaultValue: 'medium',
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      next_followup_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      file_type: {
        type: Sequelize.STRING(50),
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

   
    await queryInterface.addConstraint('activities', {
      fields: ['direction'],
      type: 'check',
      name: 'activities_direction_check',
      where: {
        direction: {
          [Sequelize.Op.in]: ['inbound', 'outbound']
        }
      }
    });

    await queryInterface.addConstraint('activities', {
      fields: ['duration_minutes'],
      type: 'check',
      name: 'activities_duration_minutes_check',
      where: {
        duration_minutes: {
          [Sequelize.Op.gte]: 0
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('activities');
    await queryInterface.dropTable('deals');
  }
}; 
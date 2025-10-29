'use strict';


module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leads', {
      lead_id: {
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
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      alt_email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      alt_phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      linkedin_profile: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      business_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      company_website: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      meta_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      source_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'leads_config',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      industry_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'leads_config',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      company_size_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'leads_config',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      product_interest: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tags: {
        type: Sequelize.JSONB,
        defaultValue: '[]',
        allowNull: true
      },
      status_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'leads_config',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      lead_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      score_grade_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'leads_config',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      qualification_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      last_contact_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      next_followup_date: {
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
      },
      job_title: {
        type: Sequelize.STRING(100),
        allowNull: true
      }
    });

   
    await queryInterface.addConstraint('leads', {
      fields: ['lead_score'],
      type: 'check',
      name: 'leads_lead_score_check',
      where: {
        lead_score: {
          [Sequelize.Op.gte]: 0
        }
      }
    });

   
    await queryInterface.addConstraint('leads', {
      fields: ['organization_id', 'email'],
      type: 'unique',
      name: 'leads_org_email_uniq'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('leads');
  }
}; 
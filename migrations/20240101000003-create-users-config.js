'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users_config', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      entity_value: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      display_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: true
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

    // Add unique constraint
    await queryInterface.addConstraint('users_config', {
      fields: ['entity_type', 'entity_value'],
      type: 'unique',
      name: 'users_config_entity_type_entity_value_key'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users_config');
  }
}; 
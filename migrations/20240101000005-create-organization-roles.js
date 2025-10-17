'use strict';


module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('organization_roles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      role: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      display_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      permissions: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      hierarchy_level: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      is_system_role: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
    await queryInterface.dropTable('organization_roles');
  }
}; 
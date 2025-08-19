'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add foreign key constraint for last_visited_organization_id in users table
    await queryInterface.addConstraint('users', {
      fields: ['last_visited_organization_id'],
      type: 'foreign key',
      name: 'users_last_visited_organization_id_fkey',
      references: {
        table: 'organizations',
        field: 'organization_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add foreign key constraint for status_id in users table
    await queryInterface.addConstraint('users', {
      fields: ['status_id'],
      type: 'foreign key',
      name: 'users_status_id_fkey',
      references: {
        table: 'users_config',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraints safely
    try {
      await queryInterface.removeConstraint('users', 'users_status_id_fkey');
    } catch (error) {
      console.log('users_status_id_fkey constraint may not exist:', error.message);
    }
    
    try {
      await queryInterface.removeConstraint('users', 'users_last_visited_organization_id_fkey');
    } catch (error) {
      console.log('users_last_visited_organization_id_fkey constraint may not exist:', error.message);
    }

    // Alternative approach: Drop constraints by SQL if the above doesn't work
    try {
      await queryInterface.sequelize.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_last_visited_organization_id_fkey;');
      await queryInterface.sequelize.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_id_fkey;');
    } catch (error) {
      console.log('SQL constraint removal failed:', error.message);
    }
  }
}; 
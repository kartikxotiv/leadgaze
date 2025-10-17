'use strict';


module.exports = {
  async up(queryInterface, Sequelize) {
   
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
  },

  async down(queryInterface, Sequelize) {
    
    try {
      await queryInterface.removeConstraint('users', 'users_last_visited_organization_id_fkey');
    } catch (error) {
      console.log('users_last_visited_organization_id_fkey constraint may not exist:', error.message);
    }

   
    try {
      await queryInterface.sequelize.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_last_visited_organization_id_fkey;');
    } catch (error) {
      console.log('SQL constraint removal failed:', error.message);
    }
  }
}; 
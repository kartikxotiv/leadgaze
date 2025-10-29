'use strict';


module.exports = {
  async up(queryInterface, Sequelize) {
   
    await queryInterface.sequelize.query(`
      CREATE FUNCTION prt_sync_reset_token() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
      BEGIN
        IF NEW.reset_token IS NULL THEN
          NEW.reset_token := NEW.token;
        END IF;
        RETURN NEW;
      END$$;
    `);

   
    await queryInterface.sequelize.query(`
      CREATE FUNCTION update_updated_at_column() RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS prt_sync_reset_token() CASCADE;');
  }
}; 
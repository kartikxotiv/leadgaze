require('dotenv').config({ path: '.env.local' });

const config = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'migration',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
      // Enable SSL for Supabase connections or when DB_SSL is enabled
      ...(process.env.DATABASE_URL?.includes('.supabase.co') || process.env.DB_SSL === "true" || (process.env.NODE_ENV === "production" && process.env.DB_SSL === "true") ? {
        ssl: {
          require: true,
          rejectUnauthorized: false  // Allow self-signed certificates for Supabase
        }
      } : {})
    },
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME_TEST || 'migration',
    host: process.env.DB_HOST  || 'localhost' ,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || "20"),
      min: parseInt(process.env.DB_POOL_MIN || "5"),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || "60000"),
      idle: parseInt(process.env.DB_POOL_IDLE || "10000"),
    }
  }
};

module.exports = config; 

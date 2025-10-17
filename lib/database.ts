import { Sequelize } from "sequelize";
import pg from "pg";

// Use environment variables for database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || 
      `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'crm'}`;

// Singleton pattern to prevent multiple database connections
let sequelizeInstance: Sequelize | null = null;

const getSequelizeInstance = (): Sequelize => {
  if (!sequelizeInstance) {
    sequelizeInstance = new Sequelize(DATABASE_URL, {
      dialect: "postgres",
      dialectModule: pg,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX || "3"), // Very conservative - only 3 connections
        min: parseInt(process.env.DB_POOL_MIN || "1"),  // Minimum 1 connection
        acquire: parseInt(process.env.DB_POOL_ACQUIRE || "10000"), // Shorter timeout
        idle: parseInt(process.env.DB_POOL_IDLE || "2000"), // Very short idle time
        evict: parseInt(process.env.DB_POOL_EVICT || "500"), // Quick eviction
        handleDisconnects: true, // Handle disconnections gracefully
      },
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      dialectOptions: {
        // Enable SSL for production if needed
        ...(process.env.NODE_ENV === "production" && process.env.DB_SSL === "true" ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        } : {})
      },
      define: {
        timestamps: true,
        underscored: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    });
  }
  return sequelizeInstance;
};

const sequelize = getSequelizeInstance();

export default sequelize;

// Test database connection with retry mechanism
export const testConnection = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log("✅ Database connection established successfully.");
      console.log(`📍 Connected to: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'crm'}`);
      return true;
    } catch (error) {
      console.error(`❌ Connection attempt ${i + 1}/${retries} failed:`, error);
      
      if (i === retries - 1) {
        console.error(`🔗 Final attempt failed for: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'crm'}`);
        return false;
      }
      
      // Wait before retry
      console.log(`⏳ Waiting 2 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
};

// Close database connection
export const closeConnection = async () => {
  if (sequelizeInstance) {
    await sequelizeInstance.close();
    sequelizeInstance = null;
    console.log("🔌 Database connection closed.");
  }
};

// Get connection pool status
export const getPoolStatus = () => {
  if (sequelizeInstance) {
    const pool = (sequelizeInstance.connectionManager as any).pool;
    return {
      used: pool?.used || 0,
      waiting: pool?.waiting || 0,
      size: pool?.size || 0,
      available: pool?.available || 0
    };
  }
  return null;
};

// Auto-test connection in development
if (process.env.NODE_ENV === "development") {
  testConnection().then((success) => {
    if (!success) {
      console.warn("⚠️  Database connection failed. API calls may not work.");
      console.warn("💡 Make sure your database is running and environment variables are set correctly.");
    }
  });
}

import { Sequelize } from "sequelize";
import pg from "pg";

// Use environment variables for database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || 
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST }:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'crm'}`;

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || "20"), // Increased for production
    min: parseInt(process.env.DB_POOL_MIN || "5"),  // Minimum connections
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || "60000"),
    idle: parseInt(process.env.DB_POOL_IDLE || "10000"),
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

export default sequelize;

// Test database connection
export const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
    console.log(`📍 Connected to: ${process.env.DB_HOST }:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'crm'}`);
    return true;
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    console.error(`🔗 Attempted connection: ${process.env.DB_HOST }:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'crm'}`);
    return false;
  }
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

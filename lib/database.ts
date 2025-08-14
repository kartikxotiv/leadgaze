import { Sequelize } from "sequelize";
import pg from "pg";

const sequelize = new Sequelize("postgres://sidharthverma@localhost/crm", {
  dialect: "postgres",
  dialectModule: pg,
  pool: {
    max: 10,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },
  logging: process.env.NODE_ENV === "development" ? console.log : false,
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
    return true;
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
    return false;
  }
};

// Auto-test connection in development
if (process.env.NODE_ENV === "development") {
  testConnection().then((success) => {
    if (!success) {
      console.warn("⚠️  Database connection failed. API calls may not work.");
    }
  });
}

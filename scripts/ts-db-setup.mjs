import { Sequelize } from "sequelize";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Database connection
const sequelize = new Sequelize("postgres://sidharthverma@localhost/crm", {
  dialect: "postgres",
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

async function setupDatabase() {
  try {
    console.log("🚀 Setting up TypeScript database...");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    // Import TypeScript models using require
    const User = require("../models/User").default;
    const Organization = require("../models/Organization").default;
    const UserOrganization = require("../models/UserOrganization").default;
    const UserSession = require("../models/UserSession").default;

    // Setup associations
    User.hasMany(Organization, {
      foreignKey: "created_by",
      as: "createdOrganizations",
    });

    User.hasMany(UserOrganization, {
      foreignKey: "user_id",
      as: "userOrganizations",
    });

    User.hasOne(UserSession, {
      foreignKey: "user_id",
      as: "session",
    });

    Organization.belongsTo(User, {
      foreignKey: "created_by",
      as: "creator",
    });

    Organization.hasMany(UserOrganization, {
      foreignKey: "organization_id",
      as: "userOrganizations",
    });

    UserOrganization.belongsTo(User, {
      foreignKey: "user_id",
      as: "user",
    });

    UserOrganization.belongsTo(Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    UserSession.belongsTo(User, {
      foreignKey: "user_id",
      as: "user",
    });

    UserSession.belongsTo(Organization, {
      foreignKey: "current_organization_id",
      as: "currentOrganization",
    });

    // Sync all tables
    await sequelize.sync({ force: true });
    console.log("✅ All tables created!");

    console.log("\n📋 Tables created:");
    console.log("  - users");
    console.log("  - organizations");
    console.log("  - user_organizations");
    console.log("  - user_sessions");

    console.log("\n🎉 TypeScript database setup complete!");
    console.log("\n📋 Features:");
    console.log("  - TypeScript models with proper types");
    console.log("  - Built-in password hashing");
    console.log("  - Role-based permissions");
    console.log("  - Trial subscription management");
    console.log("  - Session tracking");
    console.log("  - Clean associations");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();

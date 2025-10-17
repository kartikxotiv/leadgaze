const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

const User = require("../models/User")(sequelize);
const Organization = require("../models/Organization")(sequelize);
const UserOrganization = require("../models/UserOrganization")(sequelize);
const UserSession = require("../models/UserSession")(sequelize);

const models = {
  User,
  Organization,
  UserOrganization,
  UserSession,
};

Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

async function setupDatabase() {
  try {
    console.log("🚀 Setting up clean database...");

   
    await sequelize.authenticate();
    console.log("✅ Database connected!");

   
    await sequelize.sync({ force: true });
    console.log("✅ All tables created!");

    console.log("\n📋 Tables created:");
    console.log("  - users");
    console.log("  - organizations");
    console.log("  - user_organizations");
    console.log("  - user_sessions");

    console.log("\n🎉 Database setup complete!");
    console.log("\n📋 Features:");
    console.log("  - Clean model structure");
    console.log("  - Built-in password hashing");
    console.log("  - Role-based permissions");
    console.log("  - Trial subscription management");
    console.log("  - Session tracking");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();

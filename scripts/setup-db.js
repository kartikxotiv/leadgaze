const { execSync } = require("child_process");

async function setupDatabase() {
  try {
    console.log("🚀 Setting up CRM Database with Multi-Organization Tables...");

    // Use ts-node to run the TypeScript file
    const { spawn } = require("child_process");

    // First, let's check if we can connect to the database
    console.log("🔍 Testing database connection...");

    // Create a simple test script
    const testScript = `
      const { Sequelize } = require("sequelize");
      
      const sequelize = new Sequelize("postgres://sidharthverma@localhost/crm", {
        dialect: "postgres",
        logging: false,
      });
      
      async function testConnection() {
        try {
          await sequelize.authenticate();
          console.log("✅ Database connection successful!");
          return true;
        } catch (error) {
          console.error("❌ Database connection failed:", error.message);
          return false;
        }
      }
      
      testConnection();
    `;

    // Write test script to temp file
    const fs = require("fs");
    const path = require("path");
    const testFile = path.join(__dirname, "temp-test.js");
    fs.writeFileSync(testFile, testScript);

    // Run test
    execSync(`node ${testFile}`, { stdio: "inherit" });
    fs.unlinkSync(testFile);

    // Ask user if they want to reset the database
    const readline = require("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question(
        "Do you want to reset the database and create all new tables? (y/N): ",
        resolve
      );
    });

    rl.close();

    const shouldReset =
      answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";

    if (shouldReset) {
      console.log("🗑️  Resetting database and creating all tables...");
    } else {
      console.log("📝 Creating new tables (keeping existing data)...");
    }

    // Create a sync script
    const syncScript = `
      const { Sequelize, DataTypes } = require("sequelize");
      
      const sequelize = new Sequelize("postgres://sidharthverma@localhost/crm", {
        dialect: "postgres",
        logging: false,
        define: {
          timestamps: true,
          underscored: true,
          createdAt: "created_at",
          updatedAt: "updated_at",
        },
      });
      
      // Define models
      const User = sequelize.define("User", {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        first_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        last_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        phone_number: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        email_verified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "suspended"),
          defaultValue: "active",
        },

        last_login_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      });
      
      const Organization = sequelize.define("Organization", {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        slug: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        industry_type: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        company_size: {
          type: DataTypes.ENUM("solo", "small", "medium", "large", "enterprise"),
          allowNull: true,
        },
        primary_use_case: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        current_tool: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "suspended"),
          defaultValue: "active",
        },
        subscription_status: {
          type: DataTypes.ENUM("trial", "active", "cancelled", "past_due", "unpaid"),
          defaultValue: "trial",
        },
        plan_type: {
          type: DataTypes.ENUM("trial", "basic", "pro", "enterprise"),
          defaultValue: "trial",
        },
        trial_starts_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        trial_ends_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        max_users: {
          type: DataTypes.INTEGER,
          defaultValue: 5,
        },
        max_workspaces: {
          type: DataTypes.INTEGER,
          defaultValue: 3,
        },
        features_enabled: {
          type: DataTypes.JSON,
          defaultValue: ["contacts", "leads", "basic_reports"],
        },
        created_by: {
          type: DataTypes.UUID,
          allowNull: false,
        },
      });
      
      const UserOrganization = sequelize.define("UserOrganization", {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        organization_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        role: {
          type: DataTypes.ENUM("owner", "admin", "manager", "viewer"),
          defaultValue: "viewer",
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "pending"),
          defaultValue: "active",
        },
        joined_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
        invited_by: {
          type: DataTypes.UUID,
          allowNull: true,
        },
      });
      
      const OrganizationWorkspace = sequelize.define("OrganizationWorkspace", {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        organization_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        slug: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("active", "inactive", "archived"),
          defaultValue: "active",
        },
        created_by: {
          type: DataTypes.UUID,
          allowNull: false,
        },
      });
      
      const UserInvitation = sequelize.define("UserInvitation", {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        organization_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        first_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        last_name: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        role: {
          type: DataTypes.ENUM("admin", "manager", "viewer"),
          defaultValue: "viewer",
        },
        invitation_token: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        invited_by: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.ENUM("pending", "accepted", "declined", "expired", "cancelled"),
          defaultValue: "pending",
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        accepted_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      });
      
      const UserSession = sequelize.define("UserSession", {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
        },
        current_organization_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        last_activity_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      });
      
      // Define associations
      User.hasMany(UserOrganization, { foreignKey: "user_id", as: "userOrganizations" });
      User.hasMany(Organization, { foreignKey: "created_by", as: "createdOrganizations" });
      User.hasMany(UserInvitation, { foreignKey: "invited_by", as: "sentInvitations" });
      User.hasOne(UserSession, { foreignKey: "user_id", as: "session" });
      
      Organization.belongsTo(User, { foreignKey: "created_by", as: "creator" });
      Organization.hasMany(UserOrganization, { foreignKey: "organization_id", as: "userOrganizations" });
      Organization.hasMany(OrganizationWorkspace, { foreignKey: "organization_id", as: "workspaces" });
      Organization.hasMany(UserInvitation, { foreignKey: "organization_id", as: "invitations" });
      
      UserOrganization.belongsTo(User, { foreignKey: "user_id", as: "user" });
      UserOrganization.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });
      UserOrganization.belongsTo(User, { foreignKey: "invited_by", as: "inviter" });
      
      OrganizationWorkspace.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });
      OrganizationWorkspace.belongsTo(User, { foreignKey: "created_by", as: "creator" });
      
      UserInvitation.belongsTo(Organization, { foreignKey: "organization_id", as: "organization" });
      UserInvitation.belongsTo(User, { foreignKey: "invited_by", as: "inviter" });
      
      UserSession.belongsTo(User, { foreignKey: "user_id", as: "user" });
      UserSession.belongsTo(Organization, { foreignKey: "current_organization_id", as: "currentOrganization" });
      
      async function syncDatabase(force = false) {
        try {
          console.log("🔄 Syncing database...");
          await sequelize.sync({ force, alter: !force });
          console.log("✅ Database synced successfully");
        } catch (error) {
          console.error("❌ Database sync failed:", error);
          throw error;
        }
      }
      
      syncDatabase(${shouldReset});
    `;

    // Write sync script to temp file
    const syncFile = path.join(__dirname, "temp-sync.js");
    fs.writeFileSync(syncFile, syncScript);

    // Run sync
    execSync(`node ${syncFile}`, { stdio: "inherit" });
    fs.unlinkSync(syncFile);

    console.log("✅ Database setup completed!");
    console.log("\n📋 New tables created:");
    console.log("  - organizations");
    console.log("  - user_organizations");
    console.log("  - organization_workspaces");
    console.log("  - user_invitations");
    console.log("  - user_sessions");
    console.log("\n📋 Next steps:");
    console.log("1. Start your Next.js development server: npm run dev");
    console.log("2. Open pgAdmin to view your database tables");
    console.log("3. Access the CRM at http://localhost:3000");
    console.log("4. Test the new multi-organization signup flow");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();

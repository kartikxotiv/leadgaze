const { Sequelize } = require("sequelize");

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

    // Import TypeScript models
    const User = require("../models/User").default;
    const Organization = require("../models/Organization").default;
    const UserOrganization = require("../models/UserOrganization").default;
    const UserSession = require("../models/UserSession").default;
    const Task = require("../models/Task").default;
    const Activity = require("../models/Activity").default;
    const PipelineStage = require("../models/PipelineStage").default;
    const Lead = require("../models/Lead").default;
    const Deal = require("../models/Deal").default;

    // Initialize models with sequelize instance
    const UserModel = User(sequelize);
    const OrganizationModel = Organization(sequelize);
    const UserOrganizationModel = UserOrganization(sequelize);
    const UserSessionModel = UserSession(sequelize);
    const TaskModel = Task(sequelize);
    const ActivityModel = Activity(sequelize);
    const PipelineStageModel = PipelineStage(sequelize);
    const LeadModel = Lead(sequelize);
    const DealModel = Deal(sequelize);

    // Setup multi-organization associations
    UserModel.hasMany(OrganizationModel, {
      foreignKey: "created_by",
      as: "createdOrganizations",
    });

    UserModel.hasMany(UserOrganizationModel, {
      foreignKey: "user_id",
      as: "userOrganizations",
    });

    UserModel.hasOne(UserSessionModel, {
      foreignKey: "user_id",
      as: "session",
    });

    OrganizationModel.belongsTo(UserModel, {
      foreignKey: "created_by",
      as: "creator",
    });

    OrganizationModel.hasMany(UserOrganizationModel, {
      foreignKey: "organization_id",
      as: "userOrganizations",
    });

    UserOrganizationModel.belongsTo(UserModel, {
      foreignKey: "user_id",
      as: "user",
    });

    UserOrganizationModel.belongsTo(OrganizationModel, {
      foreignKey: "organization_id",
      as: "organization",
    });

    UserSessionModel.belongsTo(UserModel, {
      foreignKey: "user_id",
      as: "user",
    });

    UserSessionModel.belongsTo(OrganizationModel, {
      foreignKey: "current_organization_id",
      as: "currentOrganization",
    });

    // Setup CRM associations
    UserModel.hasMany(LeadModel, {
      foreignKey: "assigned_to",
      as: "assignedLeads",
    });

    UserModel.hasMany(LeadModel, {
      foreignKey: "created_by",
      as: "createdLeads",
    });

    UserModel.hasMany(DealModel, {
      foreignKey: "assigned_to",
      as: "assignedDeals",
    });

    UserModel.hasMany(DealModel, {
      foreignKey: "created_by",
      as: "createdDeals",
    });

    UserModel.hasMany(TaskModel, {
      foreignKey: "assigned_to",
      as: "assignedTasks",
    });

    UserModel.hasMany(TaskModel, {
      foreignKey: "created_by",
      as: "createdTasks",
    });

    UserModel.hasMany(ActivityModel, {
      foreignKey: "user_id",
      as: "activities",
    });

    LeadModel.belongsTo(UserModel, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    LeadModel.belongsTo(UserModel, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    LeadModel.hasMany(DealModel, {
      foreignKey: "lead_id",
      as: "deals",
    });

    LeadModel.hasMany(TaskModel, {
      foreignKey: "lead_id",
      as: "tasks",
    });

    LeadModel.hasMany(ActivityModel, {
      foreignKey: "related_id",
      as: "activities",
      scope: {
        relatedType: "lead",
      },
    });

    DealModel.belongsTo(LeadModel, {
      foreignKey: "lead_id",
      as: "lead",
    });

    DealModel.belongsTo(PipelineStageModel, {
      foreignKey: "stage_id",
      as: "stage",
    });

    DealModel.belongsTo(UserModel, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    DealModel.belongsTo(UserModel, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    DealModel.hasMany(TaskModel, {
      foreignKey: "deal_id",
      as: "tasks",
    });

    DealModel.hasMany(ActivityModel, {
      foreignKey: "related_id",
      as: "activities",
      scope: {
        relatedType: "deal",
      },
    });

    PipelineStageModel.hasMany(DealModel, {
      foreignKey: "stage_id",
      as: "deals",
    });

    TaskModel.belongsTo(UserModel, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    TaskModel.belongsTo(UserModel, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    TaskModel.belongsTo(LeadModel, {
      foreignKey: "lead_id",
      as: "lead",
    });

    TaskModel.belongsTo(DealModel, {
      foreignKey: "deal_id",
      as: "deal",
    });

    ActivityModel.belongsTo(UserModel, {
      foreignKey: "user_id",
      as: "user",
    });

    ActivityModel.belongsTo(LeadModel, {
      foreignKey: "related_id",
      as: "lead",
      constraints: false,
      scope: {
        relatedType: "lead",
      },
    });

    ActivityModel.belongsTo(DealModel, {
      foreignKey: "related_id",
      as: "deal",
      constraints: false,
      scope: {
        relatedType: "deal",
      },
    });

    // Sync all tables
    await sequelize.sync({ force: true });
    console.log("✅ All tables created!");

    console.log("\n📋 Tables created:");
    console.log("  - users");
    console.log("  - organizations");
    console.log("  - user_organizations");
    console.log("  - user_sessions");
    console.log("  - tasks");
    console.log("  - activities");
    console.log("  - pipeline_stages");
    console.log("  - leads");
    console.log("  - deals");

    console.log("\n🎉 TypeScript database setup complete!");
    console.log("\n📋 Features:");
    console.log("  - TypeScript models with proper types");
    console.log("  - Built-in password hashing");
    console.log("  - Role-based permissions");
    console.log("  - Trial subscription management");
    console.log("  - Session tracking");
    console.log("  - CRM functionality (leads, deals, tasks, activities)");
    console.log("  - Pipeline management");
    console.log("  - Clean associations");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();

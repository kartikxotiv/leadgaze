const { Sequelize } = require("sequelize");
const pg = require("pg");

// Create sequelize instance using environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || 
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST }:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'crm'}`;

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  dialectModule: pg,
  logging: console.log,
  define: {
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
});

// Import models
const User = require("../models/User").default;
const Organization = require("../models/Organization").default;
const UserOrganization = require("../models/UserOrganization").default;
const UserSession = require("../models/UserSession").default;
const Task = require("../models/Task").default;
const Activity = require("../models/Activity").default;
const PipelineStage = require("../models/PipelineStage").default;
const Lead = require("../models/Lead").default;
const Deal = require("../models/Deal").default;

// Initialize models
const UserModel = User(sequelize);
const OrganizationModel = Organization(sequelize);
const UserOrganizationModel = UserOrganization(sequelize);
const UserSessionModel = UserSession(sequelize);
const TaskModel = Task(sequelize);
const ActivityModel = Activity(sequelize);
const PipelineStageModel = PipelineStage(sequelize);
const LeadModel = Lead(sequelize);
const DealModel = Deal(sequelize);

// Create models object for associations
const models = {
  User: UserModel,
  Organization: OrganizationModel,
  UserOrganization: UserOrganizationModel,
  UserSession: UserSessionModel,
  Task: TaskModel,
  Activity: ActivityModel,
  PipelineStage: PipelineStageModel,
  Lead: LeadModel,
  Deal: DealModel,
};

// Setup associations
UserModel.associate(models);
OrganizationModel.associate(models);
UserOrganizationModel.associate(models);
UserSessionModel.associate(models);
TaskModel.associate(models);
ActivityModel.associate(models);
PipelineStageModel.associate(models);
LeadModel.associate(models);
DealModel.associate(models);

async function syncDatabase() {
  try {
    console.log("🔄 Starting database sync...");
    
    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully.");
    
    // Sync all models (create tables)
    await sequelize.sync({ force: true });
    console.log("✅ All tables created successfully!");
    
    console.log("📋 Tables created:");
    console.log("- users (with setup question columns)");
    console.log("- organizations (with setup question columns)");
    console.log("- user_organizations");
    console.log("- user_sessions");
    console.log("- tasks");
    console.log("- activities");
    console.log("- pipeline_stages");
    console.log("- leads");
    console.log("- deals");
    
    console.log("\n🎉 Database sync completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database sync failed:", error);
    process.exit(1);
  }
}

syncDatabase(); 
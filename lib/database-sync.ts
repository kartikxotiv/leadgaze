import sequelize from "./database";
import {
  User,
  Organization,
  UserOrganization,
  OrganizationWorkspace,
  UserInvitation,
  UserSession,
  EmailOTP,
  PipelineStage,
  Deal,
  Task,
} from "@/models";

export const syncDatabase = async (force = false) => {
  try {
    console.log("🔄 Syncing database...");

    // Sync all models
    await sequelize.sync({ force, alter: !force });

    console.log("✅ Database synced successfully");

    // Seed initial data if force is true (fresh database)
    if (force) {
      await seedInitialData();
    }
  } catch (error) {
    console.error("❌ Database sync failed:", error);
    throw error;
  }
};

const seedInitialData = async () => {
  try {
    console.log("🌱 Seeding initial data...");

    // Create default users
    const users = await User.bulkCreate([
      {
        email: "sarah.johnson@company.com",
        name: "Sarah Johnson",
        role: "BDM",
        department: "Sales",
        phone: "+1 (555) 123-4567",
      },
      {
        email: "mike.brown@company.com",
        name: "Mike Brown",
        role: "SDR",
        department: "Sales",
        phone: "+1 (555) 234-5678",
      },
      {
        email: "lisa.davis@company.com",
        name: "Lisa Davis",
        role: "SDR",
        department: "Sales",
        phone: "+1 (555) 345-6789",
      },
      {
        email: "admin@company.com",
        name: "Admin User",
        role: "Admin",
        department: "Management",
        phone: "+1 (555) 456-7890",
      },
    ]);

    // Create default pipeline stages
    const stages = await PipelineStage.bulkCreate([
      { name: "New", position: 1, color: "bg-blue-500" },
      { name: "Contacted", position: 2, color: "bg-yellow-500" },
      { name: "Qualified", position: 3, color: "bg-orange-500" },
      { name: "Demo Scheduled", position: 4, color: "bg-purple-500" },
      { name: "Proposal Sent", position: 5, color: "bg-green-500" },
      { name: "Negotiation", position: 6, color: "bg-red-500" },
      { name: "Won", position: 7, color: "bg-emerald-500" },
      { name: "Lost", position: 8, color: "bg-gray-500" },
    ]);

    // Create sample deals
    await Deal.bulkCreate([
      {
        stage_id: stages[0].id,
        value: 50000,
        probability: 10,
        expected_close_date: new Date("2024-03-15"),
        notes: "Initial contact made",
        assigned_to: users[0].id,
      },
      {
        stage_id: stages[2].id,
        value: 75000,
        probability: 60,
        expected_close_date: new Date("2024-02-28"),
        notes: "Budget confirmed",
        assigned_to: users[1].id,
      },
      {
        stage_id: stages[3].id,
        value: 120000,
        probability: 75,
        expected_close_date: new Date("2024-02-20"),
        notes: "Demo scheduled for next week",
        assigned_to: users[0].id,
      },
    ]);

    // Create sample tasks
    await Task.bulkCreate([
      {
        title: "Follow up with potential client",
        description: "Call to discuss proposal feedback",
        type: "Call",
        priority: "High",
        status: "Pending",
        due_date: new Date("2024-01-17T14:00:00"),
        assigned_to: users[0].id,
        created_by: users[0].id,
      },
      {
        title: "Demo call preparation",
        description: "Product demonstration for enterprise features",
        type: "Meeting",
        priority: "Medium",
        status: "Scheduled",
        due_date: new Date("2024-01-18T10:00:00"),
        assigned_to: users[1].id,
        created_by: users[1].id,
      },
      {
        title: "Prepare client proposal",
        description: "Prepare and send detailed proposal with pricing",
        type: "Task",
        priority: "High",
        status: "In Progress",
        due_date: new Date("2024-01-19T17:00:00"),
        assigned_to: users[0].id,
        created_by: users[0].id,
      },
    ]);

    console.log("✅ Initial data seeded successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
};

export { seedInitialData };

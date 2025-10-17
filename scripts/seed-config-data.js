const { Sequelize } = require("sequelize");
require('dotenv').config();



const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || 
  `postgres


  console.log(DATABASE_URL, "database url");


const sequelize = new Sequelize(DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

async function seedConfigData() {
  try {
    console.log("🌱 Starting config data seeding...");

   
    await sequelize.authenticate();
    console.log("✅ Database connected!");

   
    const UserConfig = sequelize.define(
      "UserConfig",
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        entityType: {
          type: Sequelize.STRING(50),
          allowNull: false,
          field: "entity_type",
        },
        entityValue: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "entity_value",
        },
        displayName: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "display_name",
        },
        description: { type: Sequelize.TEXT, allowNull: true },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          field: "is_active",
        },
      },
      { tableName: "users_config" }
    );

    const OrganizationConfig = sequelize.define(
      "OrganizationConfig",
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        entityType: {
          type: Sequelize.STRING(50),
          allowNull: false,
          field: "entity_type",
        },
        entityValue: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "entity_value",
        },
        displayName: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "display_name",
        },
        numericValue: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: "numeric_value",
        },
        description: { type: Sequelize.TEXT, allowNull: true },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          field: "is_active",
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          field: "sort_order",
        },
      },
      { tableName: "organization_config" }
    );

    const OrganizationRole = sequelize.define(
      "OrganizationRole",
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        role: { type: Sequelize.STRING(50), allowNull: false, unique: true },
        displayName: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "display_name",
        },
        description: { type: Sequelize.TEXT, allowNull: true },
        permissions: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: {},
        },
        isSystemRole: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          field: "is_system_role",
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          field: "is_active",
        },
        hierarchyLevel: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          field: "hierarchy_level",
        },
      },
      { tableName: "organization_roles" }
    );

    console.log("📋 Seeding UserConfig data...");

   
    const userConfigData = [
     
      {
        entityType: "status",
        entityValue: "active",
        displayName: "Active",
        description: "User account is active and can access the system",
        isActive: true,
      },
      {
        entityType: "status",
        entityValue: "inactive",
        displayName: "Inactive",
        description: "User account is temporarily inactive",
        isActive: true,
      },
      {
        entityType: "status",
        entityValue: "suspended",
        displayName: "Suspended",
        description: "User account is suspended due to policy violation",
        isActive: true,
      },
     
      {
        entityType: "invitation_status",
        entityValue: "pending",
        displayName: "Pending",
        description: "Invitation sent, awaiting user response",
        isActive: true,
      },
      {
        entityType: "invitation_status",
        entityValue: "accepted",
        displayName: "Accepted",
        description: "User accepted the invitation",
        isActive: true,
      },
      {
        entityType: "invitation_status",
        entityValue: "declined",
        displayName: "Declined",
        description: "User declined the invitation",
        isActive: true,
      },
      {
        entityType: "invitation_status",
        entityValue: "expired",
        displayName: "Expired",
        description: "Invitation expired before acceptance",
        isActive: true,
      },
      {
        entityType: "invitation_status",
        entityValue: "cancelled",
        displayName: "Cancelled",
        description: "Admin cancelled the invitation",
        isActive: true,
      },
    ];

    for (const config of userConfigData) {
      await UserConfig.findOrCreate({
        where: {
          entityType: config.entityType,
          entityValue: config.entityValue,
        },
        defaults: config,
      });
    }

    console.log("📋 Seeding OrganizationConfig data...");

   
    const organizationConfigData = [
     
      {
        entityType: "company_size",
        entityValue: "solo",
        numericValue: 1,
        description: "Just me (1 employee)",
        isActive: true,
        sortOrder: 1,
      },
      {
        entityType: "company_size",
        entityValue: "small",
        numericValue: 10,
        description: "Small business (2-10 employees)",
        isActive: true,
        sortOrder: 2,
      },
      {
        entityType: "company_size",
        entityValue: "medium",
        numericValue: 50,
        description: "Growing business (11-50 employees)",
        isActive: true,
        sortOrder: 3,
      },
      {
        entityType: "company_size",
        entityValue: "large",
        numericValue: 200,
        description: "Medium business (51-200 employees)",
        isActive: true,
        sortOrder: 4,
      },
      {
        entityType: "company_size",
        entityValue: "enterprise",
        numericValue: 1000,
        description: "Large business (201-1000 employees)",
        isActive: true,
        sortOrder: 5,
      },
      {
        entityType: "company_size",
        entityValue: "mega_enterprise",
        numericValue: 10000,
        description: "Enterprise (1000+ employees)",
        isActive: true,
        sortOrder: 6,
      },

     
      {
        entityType: "status",
        entityValue: "active",
        description: "Organization is active and operational",
        isActive: true,
        sortOrder: 1,
      },
      {
        entityType: "status",
        entityValue: "inactive",
        description: "Organization is temporarily inactive",
        isActive: true,
        sortOrder: 2,
      },
      {
        entityType: "status",
        entityValue: "suspended",
        description: "Organization is suspended",
        isActive: true,
        sortOrder: 3,
      },

     
      {
        entityType: "subscription_status",
        entityValue: "trial",
        description: "14-day free trial period",
        isActive: true,
        sortOrder: 1,
      },
      {
        entityType: "subscription_status",
        entityValue: "active",
        description: "Active paid subscription",
        isActive: true,
        sortOrder: 2,
      },
      {
        entityType: "subscription_status",
        entityValue: "cancelled",
        description: "Subscription cancelled by user",
        isActive: true,
        sortOrder: 3,
      },
      {
        entityType: "subscription_status",
        entityValue: "past_due",
        description: "Payment is past due",
        isActive: true,
        sortOrder: 4,
      },
      {
        entityType: "subscription_status",
        entityValue: "unpaid",
        description: "Payment failed",
        isActive: true,
        sortOrder: 5,
      },

     
      {
        entityType: "plan_type",
        entityValue: "trial",
        description: "14-day trial with basic features",
        isActive: true,
        sortOrder: 1,
      },
      {
        entityType: "plan_type",
        entityValue: "basic",
        description: "Basic plan for small teams",
        isActive: true,
        sortOrder: 2,
      },
      {
        entityType: "plan_type",
        entityValue: "pro",
        description: "Professional plan for growing businesses",
        isActive: true,
        sortOrder: 3,
      },
      {
        entityType: "plan_type",
        entityValue: "enterprise",
        description: "Enterprise plan for large organizations",
        isActive: true,
        sortOrder: 4,
      },

     
      {
        entityType: "max_users",
        entityValue: "trial_limit",
        numericValue: 5,
        description: "Maximum users for trial organizations",
        isActive: true,
        sortOrder: 1,
      },
      {
        entityType: "max_users",
        entityValue: "basic_limit",
        numericValue: 25,
        description: "Maximum users for basic plan",
        isActive: true,
        sortOrder: 2,
      },
      {
        entityType: "max_users",
        entityValue: "pro_limit",
        numericValue: 100,
        description: "Maximum users for pro plan",
        isActive: true,
        sortOrder: 3,
      },
      {
        entityType: "max_users",
        entityValue: "enterprise_limit",
        numericValue: 1000,
        description: "Maximum users for enterprise plan",
        isActive: true,
        sortOrder: 4,
      },

     
      {
        entityType: "max_workspaces",
        entityValue: "trial_limit",
        numericValue: 3,
        description: "Maximum workspaces for trial organizations",
        isActive: true,
        sortOrder: 1,
      },
      {
        entityType: "max_workspaces",
        entityValue: "basic_limit",
        numericValue: 10,
        description: "Maximum workspaces for basic plan",
        isActive: true,
        sortOrder: 2,
      },
      {
        entityType: "max_workspaces",
        entityValue: "pro_limit",
        numericValue: 50,
        description: "Maximum workspaces for pro plan",
        isActive: true,
        sortOrder: 3,
      },
      {
        entityType: "max_workspaces",
        entityValue: "enterprise_limit",
        numericValue: 1000,
        description: "Maximum workspaces for enterprise plan",
        isActive: true,
        sortOrder: 4,
      },
    ];

    for (const config of organizationConfigData) {
      await OrganizationConfig.findOrCreate({
        where: {
          entityType: config.entityType,
          entityValue: config.entityValue,
        },
        defaults: config,
      });
    }

    console.log("📋 Seeding OrganizationRole data...");

   
    const rolePermissions = {
      owner: {
       
        can_manage_organization: true,
        can_delete_organization: true,
        can_manage_subscription: true,
       
        can_invite_users: true,
        can_remove_users: true,
        can_change_user_roles: true,
       
        can_create_workspaces: true,
        can_delete_workspaces: true,
        can_manage_workspaces: true,
       
        can_view_all_data: true,
        can_edit_all_data: true,
        can_delete_all_data: true,
       
        can_view_reports: true,
        can_export_data: true,
      },
      admin: {
       
        can_manage_organization: true,
        can_delete_organization: false,
        can_manage_subscription: false,
       
        can_invite_users: true,
        can_remove_users: true,
        can_change_user_roles: true,
       
        can_create_workspaces: true,
        can_delete_workspaces: true,
        can_manage_workspaces: true,
       
        can_view_all_data: true,
        can_edit_all_data: true,
        can_delete_all_data: true,
       
        can_view_reports: true,
        can_export_data: true,
      },
      manager: {
       
        can_manage_organization: false,
        can_delete_organization: false,
        can_manage_subscription: false,
       
        can_invite_users: true,
        can_remove_users: false,
        can_change_user_roles: false,
       
        can_create_workspaces: true,
        can_delete_workspaces: false,
        can_manage_workspaces: true,
       
        can_view_all_data: true,
        can_edit_all_data: true,
        can_delete_all_data: false,
       
        can_view_reports: true,
        can_export_data: false,
      },
      viewer: {
       
        can_manage_organization: false,
        can_delete_organization: false,
        can_manage_subscription: false,
       
        can_invite_users: false,
        can_remove_users: false,
        can_change_user_roles: false,
       
        can_create_workspaces: false,
        can_delete_workspaces: false,
        can_manage_workspaces: false,
       
        can_view_all_data: true,
        can_edit_all_data: false,
        can_delete_all_data: false,
       
        can_view_reports: false,
        can_export_data: false,
      },
    };

    const organizationRoleData = [
      {
        role: "owner",
        displayName: "Owner",
        description:
          "Full access to organization settings, billing, and all data",
        permissions: rolePermissions.owner,
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 100,
      },
      {
        role: "admin",
        displayName: "Administrator",
        description:
          "Manage users, workspaces, and organization settings (except billing)",
        permissions: rolePermissions.admin,
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 80,
      },
      {
        role: "manager",
        displayName: "Manager",
        description: "Manage workspaces and team data, invite users",
        permissions: rolePermissions.manager,
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 60,
      },
      {
        role: "viewer",
        displayName: "Viewer",
        description: "View-only access to data",
        permissions: rolePermissions.viewer,
        isSystemRole: true,
        isActive: true,
        hierarchyLevel: 20,
      },
    ];

    for (const roleData of organizationRoleData) {
      await OrganizationRole.findOrCreate({
        where: {
          role: roleData.role,
        },
        defaults: roleData,
      });
    }

    console.log("✅ Config data seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`- UserConfig: ${userConfigData.length} records`);
    console.log(
      `- OrganizationConfig: ${organizationConfigData.length} records`
    );
    console.log(`- OrganizationRole: ${organizationRoleData.length} records`);

    console.log("\n🎯 Next steps:");
    console.log("1. Run database sync to create tables");
    console.log("2. Run this seed script to populate config data");
    console.log("3. Update API endpoints to use new normalized structure");
    console.log("4. Test authentication flows");

    process.exit(0);
  } catch (error) {
    console.error("❌ Config data seeding failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedConfigData();
}

module.exports = { seedConfigData };

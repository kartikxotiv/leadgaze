const { Sequelize } = require("sequelize");
const pg = require("pg");

// Database connection
const sequelize = new Sequelize("postgres://crm_user:Xotiv%40123@89.116.134.1:5432/crm_db", {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
});

async function seedConfigDataSQL() {
  try {
    console.log("🌱 Starting config data seeding with SQL...");

    await sequelize.authenticate();
    console.log("✅ Database connected!");

    // Clear existing config data
    console.log("🗑️  Clearing existing config data...");
    await sequelize.query("DELETE FROM organization_roles;");
    await sequelize.query("DELETE FROM organization_config;");
    await sequelize.query("DELETE FROM users_config;");

    // Seed UserConfig data
    console.log("📋 Seeding UserConfig data...");

    const userConfigData = [
      // User statuses
      {
        entityType: "status",
        entityValue: "active",
        displayName: "Active",
        description: "User account is active and can access the system",
      },
      {
        entityType: "status",
        entityValue: "inactive",
        displayName: "Inactive",
        description: "User account is temporarily inactive",
      },
      {
        entityType: "status",
        entityValue: "suspended",
        displayName: "Suspended",
        description: "User account is suspended due to policy violation",
      },

      // Invitation statuses
      {
        entityType: "invitation_status",
        entityValue: "pending",
        displayName: "Pending",
        description: "Invitation sent, awaiting user response",
      },
      {
        entityType: "invitation_status",
        entityValue: "accepted",
        displayName: "Accepted",
        description: "User accepted the invitation",
      },
      {
        entityType: "invitation_status",
        entityValue: "declined",
        displayName: "Declined",
        description: "User declined the invitation",
      },
      {
        entityType: "invitation_status",
        entityValue: "expired",
        displayName: "Expired",
        description: "Invitation expired before acceptance",
      },
      {
        entityType: "invitation_status",
        entityValue: "cancelled",
        displayName: "Cancelled",
        description: "Admin cancelled the invitation",
      },
    ];

    // for (const config of userConfigData) {
    //   await sequelize.query(
    //     `
    //     INSERT INTO users_config (entity_type, entity_value, display_name, description, is_active, sort_order)
    //     VALUES (:entityType, :entityValue, :displayName, :description, true, 0)
    //     ON CONFLICT (entity_type, entity_value) DO NOTHING;
    //   `,
    //     {
    //       replacements: config,
    //     }
    //   );
    // }

    // Seed OrganizationConfig data
    console.log("📋 Seeding OrganizationConfig data...");

    const organizationConfigData = [
      // Company sizes (with numeric values for limits)
      {
        entityType: "company_size",
        entityValue: "solo",
        displayName: "Just me (1)",
        description: "Solo entrepreneur or freelancer",
        sortOrder: 1,
      },
      {
        entityType: "company_size",
        entityValue: "small",
        displayName: "Small (2-10)",
        description: "Small business with 2-10 employees",
        sortOrder: 2,
      },
      {
        entityType: "company_size",
        entityValue: "medium",
        displayName: "Medium (11-50)",
        description: "Growing business with 11-50 employees",
        sortOrder: 3,
      },
      {
        entityType: "company_size",
        entityValue: "large",
        displayName: "Large (51-200)",
        description: "Large business with 51-200 employees",
        sortOrder: 4,
      },
      {
        entityType: "company_size",
        entityValue: "enterprise",
        displayName: "Enterprise (201-1000)",
        description: "Enterprise with 201-1000 employees",
        sortOrder: 5,
      },
      {
        entityType: "company_size",
        entityValue: "mega_enterprise",
        displayName: "Mega Enterprise (1000+)",
        description: "Large enterprise with 1000+ employees",
        sortOrder: 6,
      },

      // Organization statuses
      {
        entityType: "status",
        entityValue: "active",
        displayName: "Active",
        description: "Organization is active and operational",
        sortOrder: 1,
      },
      {
        entityType: "status",
        entityValue: "inactive",
        displayName: "Inactive",
        description: "Organization is temporarily inactive",
        sortOrder: 2,
      },
      {
        entityType: "status",
        entityValue: "suspended",
        displayName: "Suspended",
        description: "Organization is suspended",
        sortOrder: 3,
      },

      // Subscription statuses
      {
        entityType: "subscription_status",
        entityValue: "trial",
        displayName: "Trial",
        description: "Free trial period",
        sortOrder: 1,
      },
      {
        entityType: "subscription_status",
        entityValue: "active",
        displayName: "Active",
        description: "Active paid subscription",
        sortOrder: 2,
      },
      {
        entityType: "subscription_status",
        entityValue: "past_due",
        displayName: "Past Due",
        description: "Payment overdue",
        sortOrder: 3,
      },
      {
        entityType: "subscription_status",
        entityValue: "cancelled",
        displayName: "Cancelled",
        description: "Subscription cancelled",
        sortOrder: 4,
      },
      {
        entityType: "subscription_status",
        entityValue: "expired",
        displayName: "Expired",
        description: "Subscription expired",
        sortOrder: 5,
      },

      // Plan types
      {
        entityType: "plan_type",
        entityValue: "trial",
        displayName: "Trial",
        description: "14-day free trial",
        sortOrder: 1,
      },
      {
        entityType: "plan_type",
        entityValue: "basic",
        displayName: "Basic",
        description: "Basic plan for small teams",
        sortOrder: 2,
      },
      {
        entityType: "plan_type",
        entityValue: "pro",
        displayName: "Professional",
        description: "Professional plan for growing businesses",
        sortOrder: 3,
      },
      {
        entityType: "plan_type",
        entityValue: "enterprise",
        displayName: "Enterprise",
        description: "Enterprise plan for large organizations",
        sortOrder: 4,
      },
    ];

    for (const config of organizationConfigData) {
      await sequelize.query(
        `
        INSERT INTO organization_config (entity_type, entity_value, display_name, description, is_active, sort_order)
        VALUES (:entityType, :entityValue, :displayName, :description, true, :sortOrder)
        ON CONFLICT (entity_type, entity_value) DO NOTHING;
      `,
        {
          replacements: config,
        }
      );
    }

    // Seed OrganizationRoles data
    console.log("📋 Seeding OrganizationRoles data...");

    const rolesData = [
      {
        role: "owner",
        displayName: "Owner",
        description:
          "Full access to organization settings, billing, and all data",
        hierarchyLevel: 100,
        permissions: JSON.stringify({
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
        }),
      },
      {
        role: "admin",
        displayName: "Administrator",
        description:
          "Manage users, workspaces, and organization settings (except billing)",
        hierarchyLevel: 80,
        permissions: JSON.stringify({
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
        }),
      },
      {
        role: "manager",
        displayName: "Manager",
        description: "Manage workspaces and team data, invite users",
        hierarchyLevel: 60,
        permissions: JSON.stringify({
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
          can_export_data: true,
        }),
      },
      {
        role: "viewer",
        displayName: "Viewer",
        description: "View-only access to data",
        hierarchyLevel: 20,
        permissions: JSON.stringify({
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
          can_view_reports: true,
          can_export_data: false,
        }),
      },
    ];

    for (const role of rolesData) {
      await sequelize.query(
        `
        INSERT INTO organization_roles (role, display_name, description, permissions, hierarchy_level, is_system_role, is_active)
        VALUES (:role, :displayName, :description, :permissions, :hierarchyLevel, true, true)
        ON CONFLICT (role) DO NOTHING;
      `,
        {
          replacements: role,
        }
      );
    }

    console.log("✅ Config data seeded successfully!");
    console.log("📊 Seeded data:");
    console.log(`   - ${userConfigData.length} user config entries`);
    console.log(
      `   - ${organizationConfigData.length} organization config entries`
    );
    console.log(`   - ${rolesData.length} organization roles`);
  } catch (error) {
    console.error("❌ Config data seeding failed:", error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedConfigDataSQL()
    .then(() => {
      console.log("✅ Seeding finished successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}

module.exports = { seedConfigDataSQL };

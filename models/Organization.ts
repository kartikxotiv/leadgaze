import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const Organization = sequelize.define(
    "Organization",
    {
      organizationId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "organization_id",
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      industryType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "industry_type",
      },
      // Config-based company size reference
      companySizeConfigId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "company_size_config_id",
        references: {
          model: "organization_config",
          key: "id",
        },
      },
      primaryUseCase: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "primary_use_case",
      },
      currentTool: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "current_tool",
      },
      // Config-based status reference
      statusId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "status_id",
        references: {
          model: "organization_config",
          key: "id",
        },
      },
      // Config-based subscription status reference
      subscriptionStatusId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "subscription_status_id",
        references: {
          model: "organization_config",
          key: "id",
        },
      },
      // Config-based plan type reference
      planTypeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "plan_type_id",
        references: {
          model: "organization_config",
          key: "id",
        },
      },
      trialStartsAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "trial_starts_at",
      },
      trialEndsAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "trial_ends_at",
      },
      maxUsers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        field: "max_users",
      },
      maxWorkspaces: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        field: "max_workspaces",
      },
      featuresEnabled: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "features_enabled",
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "created_by",
        references: {
          model: "users",
          key: "user_id",
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at",
      },
    },
    {
      tableName: "organizations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["slug"] },
        { fields: ["status_id"] },
        { fields: ["subscription_status_id"] },
        { fields: ["plan_type_id"] },
        { fields: ["company_size_config_id"] },
        { fields: ["created_by"] },
      ],
      hooks: {
        beforeCreate: async (org: any) => {
          if (!org.slug) {
            org.slug = generateSlug(org.name);
          }
          if (!org.trialStartsAt) {
            org.trialStartsAt = new Date();
          }
          if (!org.trialEndsAt) {
            org.trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
          }
        },
      },
    }
  );

  // Static methods
  (Organization as any).findBySlug = function (slug: string) {
    return this.findOne({
      where: {
        slug: slug.toLowerCase(),
      },
    });
  };

  (Organization as any).findActive = function () {
    return this.findAll({
      where: {
        status: "active",
      },
    });
  };

  (Organization as any).findTrialOrganizations = function () {
    return this.findAll({
      where: {
        subscriptionStatus: "trial",
      },
    });
  };

  (Organization as any).findByCreator = function (userId: string) {
    return this.findAll({
      where: {
        createdBy: userId,
      },
    });
  };

  // Helper functions (not attached to prototype to avoid TypeScript issues)
  (Organization as any).getTrialDaysRemaining = function (org: any) {
    if (!org.trialEndsAt) return null;
    const now = new Date();
    const diffTime = org.trialEndsAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  (Organization as any).isTrialExpired = function (org: any) {
    if (!org.trialEndsAt) return false;
    return new Date() > org.trialEndsAt;
  };

  (Organization as any).canAddUser = function (
    org: any,
    currentUserCount: number
  ) {
    return currentUserCount < org.maxUsers;
  };

  (Organization as any).canAddWorkspace = function (
    org: any,
    currentWorkspaceCount: number
  ) {
    return currentWorkspaceCount < org.maxWorkspaces;
  };

  (Organization as any).hasFeature = function (org: any, feature: string) {
    return org.featuresEnabled && org.featuresEnabled.includes(feature);
  };

  (Organization as any).getPublicInfo = function (org: any) {
    return {
      organizationId: org.organizationId,
      name: org.name,
      slug: org.slug,
      description: org.description,
      industryType: org.industryType,
      companySizeConfigId: org.companySizeConfigId,
      primaryUseCase: org.primaryUseCase,
      currentTool: org.currentTool,
      statusId: org.statusId,
      subscriptionStatusId: org.subscriptionStatusId,
      planTypeId: org.planTypeId,
      trialStartsAt: org.trialStartsAt,
      trialEndsAt: org.trialEndsAt,
      maxUsers: org.maxUsers,
      maxWorkspaces: org.maxWorkspaces,
      featuresEnabled: org.featuresEnabled,
      createdAt: org.createdAt,
    };
  };

  // Associations
  (Organization as any).associate = (models: any) => {
    Organization.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
    Organization.hasMany(models.UserOrganization, {
      foreignKey: "organization_id",
      as: "userOrganizations",
    });

    // Config-based models - enabled for config-based schema
    Organization.hasMany(models.UserInvitation, {
      foreignKey: "organization_id",
      as: "invitations",
    });

    // Config-based associations
    Organization.belongsTo(models.OrganizationConfig, {
      foreignKey: "status_id",
      as: "statusConfig",
    });
    Organization.belongsTo(models.OrganizationConfig, {
      foreignKey: "company_size_config_id",
      as: "companySizeConfig",
    });
    Organization.belongsTo(models.OrganizationConfig, {
      foreignKey: "subscription_status_id",
      as: "subscriptionStatusConfig",
    });
    Organization.belongsTo(models.OrganizationConfig, {
      foreignKey: "plan_type_id",
      as: "planTypeConfig",
    });
    Organization.hasMany(models.OrganizationWorkspace, {
      foreignKey: "organization_id",
      as: "workspaces",
    });
  };

  return Organization;
};

// Helper function
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

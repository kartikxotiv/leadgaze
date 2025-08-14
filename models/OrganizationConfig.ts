import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const OrganizationConfig = sequelize.define(
    "OrganizationConfig",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      entityType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "entity_type",
        validate: {
          isIn: [
            [
              "company_size",
              "status",
              "subscription_status",
              "plan_type",
              "max_users",
              "max_workspaces",
            ],
          ],
        },
      },
      entityValue: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "entity_value",
      },
      numericValue: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "numeric_value",
        comment: "For numeric configs like max_users, max_workspaces",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "sort_order",
        comment: "For ordering options in UI",
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
      tableName: "organization_config",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["entity_type", "entity_value"] },
        { fields: ["entity_type"] },
        { fields: ["is_active"] },
        { fields: ["sort_order"] },
      ],
    }
  );

  // Static methods for common queries
  (OrganizationConfig as any).getCompanySizeOptions = function () {
    return this.findAll({
      where: {
        entityType: "company_size",
        isActive: true,
      },
      order: [["sort_order", "ASC"]],
    });
  };

  (OrganizationConfig as any).getStatusOptions = function () {
    return this.findAll({
      where: {
        entityType: "status",
        isActive: true,
      },
    });
  };

  (OrganizationConfig as any).getSubscriptionStatusOptions = function () {
    return this.findAll({
      where: {
        entityType: "subscription_status",
        isActive: true,
      },
    });
  };

  (OrganizationConfig as any).getPlanTypeOptions = function () {
    return this.findAll({
      where: {
        entityType: "plan_type",
        isActive: true,
      },
      order: [["sort_order", "ASC"]],
    });
  };

  (OrganizationConfig as any).getConfigByTypeAndValue = function (
    type: string,
    value: string
  ) {
    return this.findOne({
      where: {
        entityType: type,
        entityValue: value,
        isActive: true,
      },
    });
  };

  (OrganizationConfig as any).getNumericConfigValue = function (
    type: string,
    value: string
  ) {
    return this.findOne({
      where: {
        entityType: type,
        entityValue: value,
        isActive: true,
      },
      attributes: ["numeric_value"],
    });
  };

  // Associations - enabled for config-based schema
  (OrganizationConfig as any).associate = (models: any) => {
    // Organizations reference this for company_size
    OrganizationConfig.hasMany(models.Organization, {
      foreignKey: "company_size_config_id",
      as: "organizationsWithCompanySize",
    });

    // Organizations reference this for status
    OrganizationConfig.hasMany(models.Organization, {
      foreignKey: "status_id",
      as: "organizationsWithStatus",
    });

    // Organizations reference this for subscription_status
    OrganizationConfig.hasMany(models.Organization, {
      foreignKey: "subscription_status_id",
      as: "organizationsWithSubscriptionStatus",
    });

    // Organizations reference this for plan_type
    OrganizationConfig.hasMany(models.Organization, {
      foreignKey: "plan_type_id",
      as: "organizationsWithPlanType",
    });
  };

  return OrganizationConfig;
};

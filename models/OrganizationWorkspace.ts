import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const OrganizationWorkspace = sequelize.define(
    "OrganizationWorkspace",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "organization_id",
        references: {
          model: "organizations",
          key: "organization_id",
        },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      statusId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "status_id",
        references: {
          model: "organization_config",
          key: "id",
        },
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
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
      tableName: "organization_workspaces",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["organization_id", "slug"] },
        { fields: ["organization_id"] },
        { fields: ["status_id"] },
        { fields: ["created_by"] },
      ],
    }
  );

  // Instance methods
  (OrganizationWorkspace as any).prototype.generateSlug = function (
    name: string
  ) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  };

  (OrganizationWorkspace as any).prototype.isActive = function () {
    return this.status === "active";
  };

  (OrganizationWorkspace as any).prototype.archive = function () {
    this.status = "archived";
    return this.save();
  };

  (OrganizationWorkspace as any).prototype.activate = function () {
    this.status = "active";
    return this.save();
  };

  // Static methods
  (OrganizationWorkspace as any).findByOrganization = function (
    organizationId: string
  ) {
    return this.findAll({
      where: {
        organizationId,
      },
      order: [["created_at", "DESC"]],
    });
  };

  (OrganizationWorkspace as any).findActiveByOrganization = function (
    organizationId: string
  ) {
    return this.findAll({
      where: {
        organizationId,
        status: "active",
      },
      order: [["name", "ASC"]],
    });
  };

  (OrganizationWorkspace as any).findBySlug = function (
    organizationId: string,
    slug: string
  ) {
    return this.findOne({
      where: {
        organizationId,
        slug,
      },
    });
  };

  (OrganizationWorkspace as any).createWorkspace = function (
    organizationId: string,
    name: string,
    description: string,
    createdBy: string
  ) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");

    return this.create({
      organizationId,
      name,
      slug,
      description,
      createdBy,
    });
  };

  (OrganizationWorkspace as any).countByOrganization = function (
    organizationId: string
  ) {
    return this.count({
      where: {
        organizationId,
        status: {
          [sequelize.Op.in]: ["active", "inactive"],
        },
      },
    });
  };

  // Associations
  (OrganizationWorkspace as any).associate = (models: any) => {
    OrganizationWorkspace.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    OrganizationWorkspace.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
  };

  return OrganizationWorkspace;
};

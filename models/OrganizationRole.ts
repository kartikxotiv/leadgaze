import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const OrganizationRole = sequelize.define(
    "OrganizationRole",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
        },
      },
      displayName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "display_name",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      permissions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {},
        comment: "JSON object containing role permissions",
      },
      isSystemRole: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "is_system_role",
        comment: "System roles cannot be deleted or modified",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      hierarchyLevel: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "hierarchy_level",
        comment:
          "Higher number = higher permissions (owner=100, admin=80, manager=60, viewer=20)",
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
      tableName: "organization_roles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["role"] },
        { fields: ["is_active"] },
        { fields: ["hierarchy_level"] },
        { fields: ["is_system_role"] },
      ],
    }
  );

  // Static methods for role management
  (OrganizationRole as any).getActiveRoles = function () {
    return this.findAll({
      where: {
        isActive: true,
      },
      order: [["hierarchy_level", "DESC"]],
    });
  };

  (OrganizationRole as any).getSystemRoles = function () {
    return this.findAll({
      where: {
        isSystemRole: true,
        isActive: true,
      },
      order: [["hierarchy_level", "DESC"]],
    });
  };

  (OrganizationRole as any).getRoleByName = function (roleName: string) {
    return this.findOne({
      where: {
        role: roleName,
        isActive: true,
      },
    });
  };

  (OrganizationRole as any).getRolePermissions = function (roleName: string) {
    return this.findOne({
      where: {
        role: roleName,
        isActive: true,
      },
      attributes: ["permissions"],
    });
  };

  // Instance methods for permission checking
  (OrganizationRole as any).prototype.hasPermission = function (
    permission: string
  ) {
    return this.permissions && this.permissions[permission] === true;
  };

  (OrganizationRole as any).prototype.getPermissionLevel = function () {
    return this.hierarchyLevel;
  };

  (OrganizationRole as any).prototype.canManageRole = function (
    targetRole: any
  ) {
    return this.hierarchyLevel > targetRole.hierarchyLevel;
  };

  // Static permission helper methods
  (OrganizationRole as any).canUserPerformAction = function (
    userRole: any,
    action: string
  ) {
    if (!userRole || !userRole.permissions) return false;
    return userRole.permissions[action] === true;
  };

  (OrganizationRole as any).isOwner = function (role: string) {
    return role === "owner";
  };

  (OrganizationRole as any).isAdmin = function (role: string) {
    return role === "admin" || role === "owner";
  };

  (OrganizationRole as any).isManager = function (role: string) {
    return role === "manager" || role === "admin" || role === "owner";
  };

  // Associations - enabled for config-based schema
  (OrganizationRole as any).associate = (models: any) => {
    // UserOrganizations reference this for role
    OrganizationRole.hasMany(models.UserOrganization, {
      foreignKey: "role_id",
      as: "userOrganizations",
    });
  };

  return OrganizationRole;
};

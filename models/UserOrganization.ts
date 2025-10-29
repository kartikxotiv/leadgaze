import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const UserOrganization = sequelize.define(
    "UserOrganization",
    {
     
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "id",
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
        references: {
          model: "users",
          key: "user_id",
        },
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
     
      roleId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "role_id",
        references: {
          model: "organization_roles",
          key: "id",
        },
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "pending"),
        allowNull: false,
        defaultValue: "active",
      },
      joinedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "joined_at",
      },
      invitedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "invited_by",
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
      tableName: "user_organizations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["user_id", "organization_id"] },
        { fields: ["user_id"] },
        { fields: ["organization_id"] },
        { fields: ["role_id"] },
        { fields: ["status"] },
      ],
    }
  );

 
  (UserOrganization as any).findByUserAndOrganization = function (
    userId: string,
    organizationId: string
  ) {
    return this.findOne({
      where: {
        userId,
        organizationId,
      },
    });
  };

  (UserOrganization as any).findByUser = function (userId: string) {
    return this.findAll({
      where: { userId },
    });
  };

  (UserOrganization as any).findByOrganization = function (
    organizationId: string
  ) {
    return this.findAll({
      where: { organizationId },
    });
  };

  (UserOrganization as any).findActiveByOrganization = function (
    organizationId: string
  ) {
    return this.findAll({
      where: {
        organizationId,
        status: "active",
      },
    });
  };

  (UserOrganization as any).findOwnersByOrganization = function (
    organizationId: string
  ) {
    return this.findAll({
      where: {
        organizationId,
        status: "active",
       
      },
    });
  };

 
  (UserOrganization as any).isOwner = function (userOrg: any) {
    return userOrg.role === "owner" || userOrg.roleId != null;
  };

  (UserOrganization as any).isAdmin = function (userOrg: any) {
    return (
      userOrg.role === "admin" ||
      userOrg.role === "owner" ||
      userOrg.roleId != null
    );
  };

  (UserOrganization as any).isManager = function (userOrg: any) {
    return (
      userOrg.role === "manager" ||
      userOrg.role === "admin" ||
      userOrg.role === "owner" ||
      userOrg.roleId != null
    );
  };

  (UserOrganization as any).canInviteUsers = function (userOrg: any) {
    return userOrg.role
      ? ["owner", "admin", "manager"].includes(userOrg.role)
      : true;
  };

  (UserOrganization as any).canManageWorkspaces = function (userOrg: any) {
    return userOrg.role ? ["owner", "admin"].includes(userOrg.role) : true;
  };

  (UserOrganization as any).canViewReports = function (userOrg: any) {
    return userOrg.role
      ? ["owner", "admin", "manager", "user"].includes(userOrg.role)
      : true;
  };

  (UserOrganization as any).getPublicInfo = function (userOrg: any) {
    return {
      userOrganizationId: userOrg.userOrganizationId,
      userId: userOrg.userId,
      organizationId: userOrg.organizationId,
      role: userOrg.role,
      roleId: userOrg.roleId,
      status: userOrg.status,
      joinedAt: userOrg.joinedAt,
      invitedBy: userOrg.invitedBy,
      createdAt: userOrg.createdAt,
    };
  };

 
  (UserOrganization as any).associate = (models: any) => {
    UserOrganization.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    UserOrganization.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });
    UserOrganization.belongsTo(models.User, {
      foreignKey: "invited_by",
      as: "inviter",
    });
    UserOrganization.belongsTo(models.OrganizationRole, {
      foreignKey: "role_id",
      as: "role",
    });
  };

  return UserOrganization;
};

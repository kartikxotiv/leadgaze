import { DataTypes, Sequelize } from "sequelize";
import crypto from "crypto";

export default (sequelize: Sequelize) => {
  const UserInvitation = sequelize.define(
    "UserInvitation",
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
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
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
      invitationToken: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
        field: "invitation_token",
      },
      invitedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "invited_by",
        references: {
          model: "users",
          key: "user_id",
        },
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Optional personal message from inviter",
      },
      statusId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "status_id",
        references: {
          model: "users_config",
          key: "id",
        },
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
      },
      acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "accepted_at",
      },
      acceptedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "accepted_by_user_id",
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
      tableName: "user_invitations",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["invitation_token"] },
        { fields: ["organization_id"] },
        { fields: ["email"] },
        { fields: ["invited_by"] },
        { fields: ["status_id"] },
        { fields: ["expires_at"] },
        { unique: true, fields: ["organization_id", "email"] }, // Prevent duplicate invitations
      ],
    }
  );

  // Instance methods
  (UserInvitation as any).prototype.isExpired = function () {
    return new Date() > this.expiresAt;
  };

  (UserInvitation as any).prototype.isAccepted = function () {
    return this.acceptedAt !== null;
  };

  (UserInvitation as any).prototype.generateToken = function () {
    this.invitationToken = crypto.randomBytes(64).toString("hex");
    return this.invitationToken;
  };

  (UserInvitation as any).prototype.markAccepted = function (userId: string) {
    this.acceptedAt = new Date();
    this.acceptedByUserId = userId;
    return this.save();
  };

  // Static methods
  (UserInvitation as any).createInvitation = function (
    organizationId: string,
    email: string,
    roleId: string,
    invitedBy: string,
    statusId: string,
    message?: string
  ) {
    const token = crypto.randomBytes(64).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    return this.create({
      organizationId,
      email,
      roleId,
      invitedBy,
      statusId,
      message,
      invitationToken: token,
      expiresAt,
    });
  };

  (UserInvitation as any).findByToken = function (token: string) {
    return this.findOne({
      where: {
        invitationToken: token,
      },
      include: [
        {
          association: "organization",
          attributes: ["organizationId", "name", "slug"],
        },
        {
          association: "role",
          attributes: ["id", "role", "displayName", "permissions"],
        },
        {
          association: "inviter",
          attributes: ["userId", "firstName", "lastName", "email"],
        },
        {
          association: "status",
          attributes: ["id", "entityValue"],
        },
      ],
    });
  };

  (UserInvitation as any).findPendingByOrganization = function (
    organizationId: string
  ) {
    return this.findAll({
      where: {
        organizationId,
      },
      include: [
        {
          association: "status",
          where: {
            entityType: "invitation_status",
            entityValue: "pending",
          },
        },
        {
          association: "role",
          attributes: ["role", "displayName"],
        },
        {
          association: "inviter",
          attributes: ["firstName", "lastName", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    });
  };

  (UserInvitation as any).findByOrganizationAndEmail = function (
    organizationId: string,
    email: string
  ) {
    return this.findOne({
      where: {
        organizationId,
        email,
      },
      include: [
        {
          association: "status",
          attributes: ["entityValue"],
        },
      ],
    });
  };

  (UserInvitation as any).cleanupExpired = function () {
    return this.destroy({
      where: {
        expiresAt: {
          [sequelize.Op.lt]: new Date(),
        },
      },
    });
  };

  // Associations
  (UserInvitation as any).associate = (models: any) => {
    UserInvitation.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    UserInvitation.belongsTo(models.OrganizationRole, {
      foreignKey: "role_id",
      as: "role",
    });

    UserInvitation.belongsTo(models.User, {
      foreignKey: "invited_by",
      as: "inviter",
    });

    UserInvitation.belongsTo(models.User, {
      foreignKey: "accepted_by_user_id",
      as: "acceptedByUser",
    });

    UserInvitation.belongsTo(models.UserConfig, {
      foreignKey: "status_id",
      as: "status",
    });
  };

  return UserInvitation;
};

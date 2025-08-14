import { DataTypes, Sequelize, Op } from "sequelize";

export default (sequelize: Sequelize) => {
  const UserSession = sequelize.define(
    "UserSession",
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
      currentOrganizationId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "current_organization_id",
        references: {
          model: "organizations",
          key: "organization_id",
        },
      },
      lastActivityAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "last_activity_at",
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
      tableName: "user_sessions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id"] },
        { fields: ["current_organization_id"] },
        { fields: ["last_activity_at"] },
      ],
      hooks: {
        beforeUpdate: async (session: any) => {
          session.lastActivityAt = new Date();
        },
      },
    }
  );

  // Static methods
  (UserSession as any).findByUser = function (userId: string) {
    return this.findOne({
      where: { userId },
    });
  };

  (UserSession as any).findActiveSessions = function () {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return this.findAll({
      where: {
        lastActivityAt: {
          [Op.gt]: thirtyMinutesAgo,
        },
      },
    });
  };

  (UserSession as any).findByOrganization = function (organizationId: string) {
    return this.findAll({
      where: { currentOrganizationId: organizationId },
    });
  };

  (UserSession as any).createOrUpdate = async function (
    userId: string,
    organizationId?: string
  ) {
    const [session] = await this.findOrCreate({
      where: { userId },
      defaults: {
        currentOrganizationId: organizationId,
        lastActivityAt: new Date(),
      },
    });

    if (organizationId && session.currentOrganizationId !== organizationId) {
      await (UserSession as any).switchOrganization(session, organizationId);
    } else {
      await (UserSession as any).updateActivity(session);
    }

    return session;
  };

  // Helper functions (not attached to prototype to avoid TypeScript issues)
  (UserSession as any).updateActivity = async function (session: any) {
    return session.update({
      lastActivityAt: new Date(),
    });
  };

  (UserSession as any).switchOrganization = async function (
    session: any,
    organizationId: string
  ) {
    return session.update({
      currentOrganizationId: organizationId,
      lastActivityAt: new Date(),
    });
  };

  (UserSession as any).clearCurrentOrganization = async function (
    session: any
  ) {
    return session.update({
      currentOrganizationId: null,
      lastActivityAt: new Date(),
    });
  };

  (UserSession as any).isActive = function (session: any) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return session.lastActivityAt > thirtyMinutesAgo;
  };

  (UserSession as any).getPublicInfo = function (session: any) {
    return {
      sessionId: session.id,
      userId: session.userId,
      currentOrganizationId: session.currentOrganizationId,
      lastActivityAt: session.lastActivityAt,
      isActive: (UserSession as any).isActive(session),
      createdAt: session.createdAt,
    };
  };

  // Associations
  (UserSession as any).associate = (models: any) => {
    UserSession.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    UserSession.belongsTo(models.Organization, {
      foreignKey: "current_organization_id",
      as: "currentOrganization",
    });
  };

  return UserSession;
};

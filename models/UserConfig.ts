import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const UserConfig = sequelize.define(
    "UserConfig",
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
          isIn: [["status", "invitation_status"]],
        },
      },
      entityValue: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "entity_value",
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
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "sort_order",
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
      tableName: "users_config",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["entity_type", "entity_value"] },
        { fields: ["entity_type"] },
        { fields: ["is_active"] },
      ],
    }
  );

 
  (UserConfig as any).getStatusOptions = function () {
    return this.findAll({
      where: {
        entityType: "status",
        isActive: true,
      },
    });
  };

  (UserConfig as any).getInvitationStatusOptions = function () {
    return this.findAll({
      where: {
        entityType: "invitation_status",
        isActive: true,
      },
    });
  };

  (UserConfig as any).getConfigByTypeAndValue = function (
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

 
  (UserConfig as any).associate = (models: any) => {
   
    UserConfig.hasMany(models.User, {
      foreignKey: "status_id",
      as: "usersWithStatus",
    });

   
    UserConfig.hasMany(models.UserInvitation, {
      foreignKey: "status_id",
      as: "invitationsWithStatus",
    });
  };

  return UserConfig;
};

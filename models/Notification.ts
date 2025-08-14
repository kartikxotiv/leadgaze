import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const Notification = sequelize.define(
    "Notification",
    {
      notificationId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "notification_id",
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
      type: {
        type: DataTypes.ENUM(
          "lead_assigned",
          "follow_up_due",
          "lead_stale",
          "lead_scored_high",
          "deal_moved",
          "deal_stuck",
          "task_overdue",
          "activity_reminder",
          "system_update",
          "bulk_import_complete",
          "escalation"
        ),
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "urgent"),
        allowNull: false,
        defaultValue: "medium",
      },
      channel: {
        type: DataTypes.ENUM("in_app", "email", "slack", "sms"),
        allowNull: false,
        defaultValue: "in_app",
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_read",
      },
      readAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "read_at",
      },
      actionUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "action_url",
      },
      actionLabel: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "action_label",
      },
      relatedType: {
        type: DataTypes.ENUM("lead", "deal", "task", "activity", "user"),
        allowNull: true,
        field: "related_type",
      },
      relatedId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "related_id",
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
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "sent_at",
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "expires_at",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Additional data specific to notification type",
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
      tableName: "notifications",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id"] },
        { fields: ["organization_id"] },
        { fields: ["type"] },
        { fields: ["priority"] },
        { fields: ["is_read"] },
        { fields: ["created_at"] },
        { fields: ["related_type", "related_id"] },
        { fields: ["expires_at"] },
      ],
    }
  );

  // Associations
  (Notification as any).associate = (models: any) => {
    Notification.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    Notification.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });
  };

  return Notification;
};

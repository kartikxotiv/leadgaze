import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const Activity = sequelize.define(
    "Activity",
    {
      activityId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "activity_id",
      },
      activityType: {
        type: DataTypes.ENUM(
          "call",
          "email",
          "linkedin",
          "meeting",
          "task",
          "note",
          "demo",
          "proposal_sent",
          "lead_created",
          "lead_updated",
          "status_changed",
          "score_updated",
          "deal_created",
          "deal_moved",
          "task_created",
          "task_completed",
          "follow_up_scheduled"
        ),
        allowNull: false,
        field: "activity_type",
      },
      relatedType: {
        type: DataTypes.ENUM("lead", "deal", "contact", "company"),
        allowNull: false,
        field: "related_type",
      },
      relatedId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "related_id",
      },
      subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      outcome: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      direction: {
        type: DataTypes.STRING(8),
        allowNull: true,
        validate: {
          isIn: [["inbound", "outbound"]],
        },
      },
      durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "duration_minutes",
        validate: {
          min: 0,
        },
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "scheduled_at",
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "completed_at",
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "due_date",
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "urgent"),
        allowNull: false,
        defaultValue: "medium",
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
      nextFollowupDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "next_followup_date",
      },
      fileUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "file_url",
      },
      fileName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "file_name",
      },
      fileType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "file_type",
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
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
      tableName: "activities",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id"] },
        { fields: ["related_type", "related_id"] },
        { fields: ["activity_type"] },
        { fields: ["scheduled_at"] },
        { fields: ["due_date"] },
        { fields: ["created_at"] },
      ],
    }
  );

  // Associations
  (Activity as any).associate = (models: any) => {
    Activity.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    Activity.belongsTo(models.Lead, {
      foreignKey: "related_id",
      as: "lead",
      constraints: false,
      scope: {
        relatedType: "lead",
      },
    });
    Activity.belongsTo(models.Deal, {
      foreignKey: "related_id",
      as: "deal",
      constraints: false,
      scope: {
        relatedType: "deal",
      },
    });
  };

  return Activity;
};

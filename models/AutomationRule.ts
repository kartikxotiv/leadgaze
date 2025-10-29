import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const AutomationRule = sequelize.define(
    "AutomationRule",
    {
      ruleId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "rule_id",
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      trigger: {
        type: DataTypes.ENUM(
          "lead_created",
          "lead_updated",
          "lead_score_changed",
          "lead_stale",
          "deal_created",
          "deal_moved",
          "deal_stuck",
          "task_created",
          "task_overdue",
          "activity_logged",
          "follow_up_due",
          "time_based"
        ),
        allowNull: false,
      },
      conditions: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: "JSON conditions that must be met for rule to fire",
      },
      actions: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: "JSON array of actions to take when rule fires",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: "Execution priority (lower number = higher priority)",
      },
      lastTriggered: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_triggered",
      },
      triggerCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "trigger_count",
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
      tableName: "automation_rules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["organization_id"] },
        { fields: ["trigger"] },
        { fields: ["is_active"] },
        { fields: ["priority"] },
        { fields: ["last_triggered"] },
      ],
    }
  );

 
  (AutomationRule as any).associate = (models: any) => {
    AutomationRule.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });
    AutomationRule.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
  };

  return AutomationRule;
};

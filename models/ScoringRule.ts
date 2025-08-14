import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const ScoringRule = sequelize.define(
    "ScoringRule",
    {
      ruleId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "rule_id",
      },
      ruleName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "rule_name",
      },
      ruleType: {
        type: DataTypes.ENUM(
          "activity_response",
          "email_interaction",
          "quotation_request",
          "no_response_penalty",
          "icp_match",
          "lead_source",
          "company_size",
          "job_title_match",
          "industry_match",
          "custom"
        ),
        allowNull: false,
        field: "rule_type",
      },
      condition: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: "JSON object defining the condition logic",
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: -100,
          max: 100,
        },
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
        comment: "Execution order (lower number = higher priority)",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      tableName: "scoring_rules",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["organization_id"] },
        { fields: ["rule_type"] },
        { fields: ["is_active"] },
        { fields: ["priority"] },
      ],
    }
  );

  // Associations
  (ScoringRule as any).associate = (models: any) => {
    ScoringRule.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });
    ScoringRule.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
  };

  return ScoringRule;
};

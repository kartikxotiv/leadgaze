import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const LeadScore = sequelize.define(
    "LeadScore",
    {
      scoreId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "score_id",
      },
      leadId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "lead_id",
        references: {
          model: "leads",
          key: "lead_id",
        },
      },
      totalScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "total_score",
      },
      tier: {
        type: DataTypes.ENUM("cold", "warm", "hot", "burning"),
        allowNull: false,
        defaultValue: "cold",
      },
      lastCalculated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "last_calculated",
      },
      scoreBreakdown: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "score_breakdown",
        comment: "Detailed breakdown of how score was calculated",
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
      tableName: "lead_scores",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["lead_id"], unique: true },
        { fields: ["tier"] },
        { fields: ["total_score"] },
        { fields: ["organization_id"] },
        { fields: ["last_calculated"] },
      ],
    }
  );

  // Associations
  (LeadScore as any).associate = (models: any) => {
    LeadScore.belongsTo(models.Lead, {
      foreignKey: "lead_id",
      as: "lead",
    });
    LeadScore.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    LeadScore.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });
  };

  return LeadScore;
};

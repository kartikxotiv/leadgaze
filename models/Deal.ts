import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const Deal = sequelize.define(
    "Deal",
    {
      dealId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "deal_id",
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
      title: {
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
      value: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
        validate: {
          min: 0,
        },
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "USD",
        validate: {
          len: [3, 3],
        },
      },
      stage: {
        type: DataTypes.ENUM(
          "qualification",
          "proposal",
          "negotiation",
          "decision",
          "closed_won",
          "closed_lost"
        ),
        allowNull: false,
        defaultValue: "qualification",
      },
      probability: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        validate: {
          min: 0,
          max: 100,
        },
      },
      source: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "urgent"),
        allowNull: false,
        defaultValue: "medium",
      },
      expectedCloseDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "expected_close_date",
      },
      actualCloseDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "actual_close_date",
      },
      lostReason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "lost_reason",
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
      tableName: "deals",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id"] },
        { fields: ["organization_id"] },
        { fields: ["lead_id"] },
        { fields: ["stage"] },
        { fields: ["expected_close_date"] },
        { fields: ["created_at"] },
      ],
    }
  );

 
  (Deal as any).associate = (models: any) => {
    Deal.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    Deal.belongsTo(models.Lead, {
      foreignKey: "lead_id",
      as: "lead",
    });
    Deal.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });
    Deal.hasMany(models.Activity, {
      foreignKey: "related_id",
      as: "activities",
      constraints: false,
      scope: {
        relatedType: "deal",
      },
    });
  };

  return Deal;
};

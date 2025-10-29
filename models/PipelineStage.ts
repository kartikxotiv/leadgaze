import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const PipelineStage = sequelize.define(
    "PipelineStage",
    {
      stageId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "stage_id",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      color: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: "#3B82F6",
        validate: {
          is: /^#[0-9A-F]{6}$/i,
        },
      },
      winProbability: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
        field: "win_probability",
      },
      averageTimeInStage: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "average_time_in_stage",
        validate: {
          min: 0,
        },
      },
      isClosedWon: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_closed_won",
      },
      isClosedLost: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_closed_lost",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: "is_active",
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
      tableName: "pipeline_stages",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["position"] },
        { fields: ["is_active"] },
        { fields: ["is_closed_won"] },
        { fields: ["is_closed_lost"] },
      ],
      hooks: {
        beforeCreate: async (stage: any) => {
          if (!stage.position) {
            const lastStage = await PipelineStage.findOne({
              order: [["position", "DESC"]],
            });
            stage.position = lastStage ? lastStage.position + 1 : 1;
          }
        },
      },
    }
  );

 
  (PipelineStage as any).associate = (models: any) => {
   
   
  };

  return PipelineStage;
};

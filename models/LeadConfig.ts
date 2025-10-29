import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const LeadConfig = sequelize.define(
    "LeadConfig",
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
          isIn: [
            [
              "status",
              "source",
              "industry",
              "company_size",
              "score_grade",
              "product_interest",
            ],
          ],
        },
      },
      entityValue: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "entity_value",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "display_order",
        defaultValue: 0,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
       
      },
      isActive: {
        type: DataTypes.BOOLEAN,
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
      tableName: "leads_config",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["entity_type", "entity_value"] },
        { fields: ["entity_type"] },
        { fields: ["is_active"] },
        { fields: ["display_order"] },
      ],
    }
  );

 
  (LeadConfig as any).getStatusOptions = function () {
    return this.findAll({
      where: {
        entityType: "status",
        isActive: true,
      },
      order: [["display_order", "ASC"]],
    });
  };

  (LeadConfig as any).getSourceOptions = function () {
    return this.findAll({
      where: {
        entityType: "source",
        isActive: true,
      },
      order: [["display_order", "ASC"]],
    });
  };

  (LeadConfig as any).getIndustryOptions = function () {
    return this.findAll({
      where: {
        entityType: "industry",
        isActive: true,
      },
      order: [["entity_value", "ASC"]],
    });
  };

  (LeadConfig as any).getCompanySizeOptions = function () {
    return this.findAll({
      where: {
        entityType: "company_size",
        isActive: true,
      },
      order: [["display_order", "ASC"]],
    });
  };

  (LeadConfig as any).getScoreGradeOptions = function () {
    return this.findAll({
      where: {
        entityType: "score_grade",
        isActive: true,
      },
      order: [["display_order", "ASC"]],
    });
  };

  (LeadConfig as any).getProductInterestOptions = function () {
    return this.findAll({
      where: {
        entityType: "product_interest",
        isActive: true,
      },
      order: [["entity_value", "ASC"]],
    });
  };

  (LeadConfig as any).getConfigByTypeAndValue = function (
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

 
  (LeadConfig as any).associate = (models: any) => {
   
    LeadConfig.hasMany(models.Lead, {
      foreignKey: "status_id",
      as: "leadsWithStatus",
    });

   
    LeadConfig.hasMany(models.Lead, {
      foreignKey: "source_id",
      as: "leadsWithSource",
    });

   
    LeadConfig.hasMany(models.Lead, {
      foreignKey: "industry_id",
      as: "leadsWithIndustry",
    });

   
    LeadConfig.hasMany(models.Lead, {
      foreignKey: "company_size_id",
      as: "leadsWithCompanySize",
    });

   
    LeadConfig.hasMany(models.Lead, {
      foreignKey: "score_grade_id",
      as: "leadsWithScoreGrade",
    });
  };

  return LeadConfig;
};

import { DataTypes, Sequelize, Op } from "sequelize";

export default (sequelize: Sequelize) => {
  const Lead = sequelize.define(
    "Lead",
    {
      leadId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "lead_id",
      },
      contactPerson: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "contact_person",
      },
      source: {
        type: DataTypes.ENUM('Website', 'Referral', 'Cold Call', 'LinkedIn', 'Email', 'Trade Show', 'Advertisement'),
        allowNull: false,
        defaultValue: 'Website',
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

     
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "first_name",
        validate: {
          notEmpty: true,
        },
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: "last_name",
        validate: {
          notEmpty: true,
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      altEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "alt_email",
        validate: {
          isEmail: true,
        },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      altPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: "alt_phone",
      },
      linkedinProfile: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "linkedin_profile",
      },
     
     
     
     
     

     
      businessName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "business_name",
      },
      companyWebsite: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "company_website",
      },

     
      jobTitle: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: "job_title",
      },

      metaData: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: "meta_data",
      },

     
      sourceId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "source_id",
        references: {
          model: "leads_config",
          key: "id",
        },
      },
      industryId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "industry_id",
        references: {
          model: "leads_config",
          key: "id",
        },
      },
      companySizeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "company_size_id",
        references: {
          model: "leads_config",
          key: "id",
        },
      },
      productInterest: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "product_interest",
      },
      tags: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },

     
      statusId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "status_id",
        references: {
          model: "leads_config",
          key: "id",
        },
      },
      assignedTo: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "assigned_to",
        references: {
          model: "users",
          key: "user_id",
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

     
      leadScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "lead_score",
        validate: {
          min: 0,
        },
      },
      scoreGradeId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "score_grade_id",
        references: {
          model: "leads_config",
          key: "id",
        },
      },
      qualificationNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "qualification_notes",
      },

     
      lastContactDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_contact_date",
      },
      nextFollowupDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "next_followup_date",
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
      tableName: "leads",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
       
        { unique: true, fields: ["organization_id", "email"] },
        { fields: ["organization_id"] },
        { fields: ["assigned_to"] },
        { fields: ["status_id"] },
        { fields: ["source_id"] },
        { fields: ["industry_id"] },
        { fields: ["lead_score"] },
        { fields: ["score_grade_id"] },
        { fields: ["next_followup_date"] },
        { fields: ["created_by"] },
        { fields: ["created_at"] },
        { fields: ["email"] },
      ],
      hooks: {
        beforeSave: async (lead: any) => {
         
          if (lead.changed("leadScore")) {
            const LeadConfig = sequelize.models.LeadConfig as any;
            let scoreGrade;

            if (lead.leadScore >= 40) {
              scoreGrade = await LeadConfig.getConfigByTypeAndValue(
                "score_grade",
                "hot"
              );
            } else if (lead.leadScore >= 20) {
              scoreGrade = await LeadConfig.getConfigByTypeAndValue(
                "score_grade",
                "warm"
              );
            } else {
              scoreGrade = await LeadConfig.getConfigByTypeAndValue(
                "score_grade",
                "cold"
              );
            }

            if (scoreGrade) {
              lead.scoreGradeId = scoreGrade.id;
            }
          }
        },
      },
    }
  );

 
  (Lead as any).findByEmail = function (email: string, organizationId: string) {
    return this.findOne({
      where: {
        email: email.toLowerCase(),
        organizationId: organizationId,
      },
    });
  };

  (Lead as any).findByOrganization = function (organizationId: string) {
    return this.findAll({
      where: {
        organizationId: organizationId,
      },
      include: [
        {
          model: sequelize.models.LeadConfig,
          as: "status",
          attributes: ["entityValue", "description"],
        },
        {
          model: sequelize.models.LeadConfig,
          as: "source",
          attributes: ["entityValue", "description"],
        },
        {
          model: sequelize.models.User,
          as: "assignedUser",
          attributes: ["firstName", "lastName", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    });
  };

  (Lead as any).findHotLeads = function (organizationId: string) {
    return this.findAll({
      where: {
        organizationId: organizationId,
        leadScore: {
          [Op.gte]: 40,
        },
      },
      include: [
        {
          model: sequelize.models.LeadConfig,
          as: "status",
          attributes: ["entityValue"],
        },
      ],
    });
  };

  (Lead as any).findOverdueFollowups = function (organizationId: string) {
    return this.findAll({
      where: {
        organizationId: organizationId,
        nextFollowupDate: {
          [Op.lt]: new Date(),
        },
      },
      include: [
        {
          model: sequelize.models.User,
          as: "assignedUser",
          attributes: ["firstName", "lastName", "email"],
        },
      ],
    });
  };

 
  (Lead as any).associate = (models: any) => {
   
    Lead.belongsTo(models.Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

   
    Lead.belongsTo(models.User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });
    Lead.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "createdUser",
    });

   
    Lead.belongsTo(models.LeadConfig, {
      foreignKey: "status_id",
      as: "status",
    });
    Lead.belongsTo(models.LeadConfig, {
      foreignKey: "source_id",
      as: "sourceConfig",
    });
    Lead.belongsTo(models.LeadConfig, {
      foreignKey: "industry_id",
      as: "industry",
    });
    Lead.belongsTo(models.LeadConfig, {
      foreignKey: "company_size_id",
      as: "companySize",
    });
    Lead.belongsTo(models.LeadConfig, {
      foreignKey: "score_grade_id",
      as: "scoreGrade",
    });

   
    Lead.hasMany(models.Activity, {
      foreignKey: "related_id",
      as: "activities",
      scope: {
        relatedType: "lead",
      },
    });

   
    Lead.hasMany(models.Deal, {
      foreignKey: "lead_id",
      as: "opportunities",
    });

   
    Lead.hasOne(models.LeadScore, {
      foreignKey: "lead_id",
      as: "scoreData",
    });
  };

  return Lead;
};

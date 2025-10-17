const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

const LeadConfig = sequelize.define(
  "LeadConfig",
  {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    entityType: {
      type: Sequelize.STRING(50),
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
      type: Sequelize.STRING(100),
      allowNull: false,
      field: "entity_value",
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    displayOrder: {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: "display_order",
      defaultValue: 0,
    },
    metadata: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
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

const Lead = sequelize.define(
  "Lead",
  {
    leadId: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
      field: "lead_id",
    },
    organizationId: {
      type: Sequelize.UUID,
      allowNull: false,
      field: "organization_id",
    },
    firstName: {
      type: Sequelize.STRING(100),
      allowNull: false,
      field: "first_name",
    },
    lastName: {
      type: Sequelize.STRING(100),
      allowNull: false,
      field: "last_name",
    },
    email: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    altEmail: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: "alt_email",
    },
    phone: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    altPhone: {
      type: Sequelize.STRING(20),
      allowNull: true,
      field: "alt_phone",
    },
    linkedinProfile: {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: "linkedin_profile",
    },
    altLinkedinProfile: {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: "alt_linkedin_profile",
    },
    businessName: {
      type: Sequelize.STRING(255),
      allowNull: true,
      field: "business_name",
    },
    companyWebsite: {
      type: Sequelize.STRING(500),
      allowNull: true,
      field: "company_website",
    },
    sourceId: {
      type: Sequelize.UUID,
      allowNull: false,
      field: "source_id",
    },
    industryId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: "industry_id",
    },
    companySizeId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: "company_size_id",
    },
    productInterest: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: "product_interest",
    },
    tags: {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    statusId: {
      type: Sequelize.UUID,
      allowNull: false,
      field: "status_id",
    },
    assignedTo: {
      type: Sequelize.UUID,
      allowNull: true,
      field: "assigned_to",
    },
    createdBy: {
      type: Sequelize.UUID,
      allowNull: false,
      field: "created_by",
    },
    leadScore: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "lead_score",
    },
    scoreGradeId: {
      type: Sequelize.UUID,
      allowNull: true,
      field: "score_grade_id",
    },
    qualificationNotes: {
      type: Sequelize.TEXT,
      allowNull: true,
      field: "qualification_notes",
    },
    lastContactDate: {
      type: Sequelize.DATE,
      allowNull: true,
      field: "last_contact_date",
    },
    nextFollowupDate: {
      type: Sequelize.DATE,
      allowNull: true,
      field: "next_followup_date",
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
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
  }
);

async function setupLeadsSystem() {
  console.log("🚀 Setting up Leads System...");

  try {
   
    await sequelize.authenticate();
    console.log("✅ Database connected!");

   
    await LeadConfig.sync({ force: true });
    console.log("✅ LeadConfig table created");

   
    const leadStatuses = [
      {
        entityType: "status",
        entityValue: "new",
        description: "New lead, not yet contacted",
        displayOrder: 1,
      },
      {
        entityType: "status",
        entityValue: "contact_attempted",
        description: "Initial contact attempted",
        displayOrder: 2,
      },
      {
        entityType: "status",
        entityValue: "in_conversation",
        description: "Lead is engaged and responding",
        displayOrder: 3,
      },
      {
        entityType: "status",
        entityValue: "qualified",
        description: "Lead meets qualification criteria",
        displayOrder: 4,
      },
      {
        entityType: "status",
        entityValue: "disqualified",
        description: "Lead is not a good fit",
        displayOrder: 5,
      },
      {
        entityType: "status",
        entityValue: "not_reachable",
        description: "Unable to reach lead",
        displayOrder: 6,
      },
    ];

   
    const leadSources = [
      {
        entityType: "source",
        entityValue: "linkedin",
        description: "LinkedIn outreach",
        displayOrder: 1,
      },
      {
        entityType: "source",
        entityValue: "cold_call",
        description: "Cold calling",
        displayOrder: 2,
      },
      {
        entityType: "source",
        entityValue: "referral",
        description: "Referred by existing contact",
        displayOrder: 3,
      },
      {
        entityType: "source",
        entityValue: "website",
        description: "Website form submission",
        displayOrder: 4,
      },
      {
        entityType: "source",
        entityValue: "email_campaign",
        description: "Email marketing campaign",
        displayOrder: 5,
      },
      {
        entityType: "source",
        entityValue: "trade_show",
        description: "Trade show or event",
        displayOrder: 6,
      },
      {
        entityType: "source",
        entityValue: "google_ads",
        description: "Google Ads campaign",
        displayOrder: 7,
      },
      {
        entityType: "source",
        entityValue: "other",
        description: "Other source",
        displayOrder: 8,
      },
    ];

   
    const industries = [
      {
        entityType: "industry",
        entityValue: "technology",
        description: "Technology & Software",
      },
      {
        entityType: "industry",
        entityValue: "healthcare",
        description: "Healthcare & Medical",
      },
      {
        entityType: "industry",
        entityValue: "finance",
        description: "Financial Services",
      },
      {
        entityType: "industry",
        entityValue: "manufacturing",
        description: "Manufacturing",
      },
      {
        entityType: "industry",
        entityValue: "retail",
        description: "Retail & E-commerce",
      },
      {
        entityType: "industry",
        entityValue: "education",
        description: "Education",
      },
      {
        entityType: "industry",
        entityValue: "real_estate",
        description: "Real Estate",
      },
      {
        entityType: "industry",
        entityValue: "consulting",
        description: "Consulting Services",
      },
      {
        entityType: "industry",
        entityValue: "construction",
        description: "Construction",
      },
      {
        entityType: "industry",
        entityValue: "other",
        description: "Other Industry",
      },
    ];

   
    const companySizes = [
      {
        entityType: "company_size",
        entityValue: "1-10",
        description: "1-10 employees",
        displayOrder: 1,
      },
      {
        entityType: "company_size",
        entityValue: "11-50",
        description: "11-50 employees",
        displayOrder: 2,
      },
      {
        entityType: "company_size",
        entityValue: "51-200",
        description: "51-200 employees",
        displayOrder: 3,
      },
      {
        entityType: "company_size",
        entityValue: "201-500",
        description: "201-500 employees",
        displayOrder: 4,
      },
      {
        entityType: "company_size",
        entityValue: "501-1000",
        description: "501-1000 employees",
        displayOrder: 5,
      },
      {
        entityType: "company_size",
        entityValue: "1001+",
        description: "1000+ employees",
        displayOrder: 6,
      },
    ];

   
    const scoreGrades = [
      {
        entityType: "score_grade",
        entityValue: "hot",
        description: "Hot lead (40+ points)",
        displayOrder: 1,
        metadata: { minScore: 40, maxScore: 100, color: "#ff4444" },
      },
      {
        entityType: "score_grade",
        entityValue: "warm",
        description: "Warm lead (20-39 points)",
        displayOrder: 2,
        metadata: { minScore: 20, maxScore: 39, color: "#ffaa00" },
      },
      {
        entityType: "score_grade",
        entityValue: "cold",
        description: "Cold lead (0-19 points)",
        displayOrder: 3,
        metadata: { minScore: 0, maxScore: 19, color: "#4444ff" },
      },
    ];

   
    const productInterests = [
      {
        entityType: "product_interest",
        entityValue: "crm_basic",
        description: "CRM Basic Plan",
      },
      {
        entityType: "product_interest",
        entityValue: "crm_professional",
        description: "CRM Professional Plan",
      },
      {
        entityType: "product_interest",
        entityValue: "crm_enterprise",
        description: "CRM Enterprise Plan",
      },
      {
        entityType: "product_interest",
        entityValue: "custom_solution",
        description: "Custom Solution",
      },
      {
        entityType: "product_interest",
        entityValue: "integration_services",
        description: "Integration Services",
      },
      {
        entityType: "product_interest",
        entityValue: "consulting",
        description: "Consulting Services",
      },
    ];

   
    const allConfigs = [
      ...leadStatuses,
      ...leadSources,
      ...industries,
      ...companySizes,
      ...scoreGrades,
      ...productInterests,
    ];

    await LeadConfig.bulkCreate(allConfigs);
    console.log("✅ Lead configuration data seeded");

   
    await Lead.sync({ force: true });
    console.log("✅ Leads table created");

    console.log("🎉 Leads system setup completed successfully!");
    console.log("\n📊 Configuration Summary:");
    console.log(`   • ${leadStatuses.length} lead statuses`);
    console.log(`   • ${leadSources.length} lead sources`);
    console.log(`   • ${industries.length} industries`);
    console.log(`   • ${companySizes.length} company sizes`);
    console.log(`   • ${scoreGrades.length} score grades`);
    console.log(`   • ${productInterests.length} product interests`);
  } catch (error) {
    console.error("❌ Error setting up leads system:", error);
    throw error;
  }
}

if (require.main === module) {
  setupLeadsSystem()
    .then(() => {
      console.log("✅ Setup completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Setup failed:", error);
      process.exit(1);
    });
}

module.exports = { setupLeadsSystem };

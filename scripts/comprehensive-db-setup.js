const { Sequelize } = require("sequelize");

// Database connection
const sequelize = new Sequelize("postgres://sidharthverma@localhost/crm", {
  dialect: "postgres",
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

async function setupDatabase() {
  try {
    console.log("🚀 Setting up comprehensive database...");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    // Define all models
    const User = sequelize.define(
      "User",
      {
        userId: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          field: "user_id",
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
          validate: { isEmail: true },
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false,
          validate: { len: [8, 255] },
        },
        firstName: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "first_name",
          validate: { notEmpty: true },
        },
        lastName: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "last_name",
          validate: { notEmpty: true },
        },
        phoneNumber: {
          type: Sequelize.STRING(20),
          allowNull: true,
          field: "phone_number",
        },
        emailVerified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          field: "email_verified",
        },
        status: {
          type: Sequelize.ENUM("active", "inactive", "suspended"),
          allowNull: false,
          defaultValue: "active",
        },

        lastLogin: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "last_login",
        },
        loginAttempts: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          field: "login_attempts",
        },
        lockUntil: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "lock_until",
        },
        passwordResetToken: {
          type: Sequelize.STRING,
          allowNull: true,
          field: "password_reset_token",
        },
        passwordResetExpires: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "password_reset_expires",
        },
        passwordChangedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "password_changed_at",
        },
      },
      {
        tableName: "users",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { unique: true, fields: ["email"] },
          { fields: ["email_verified"] },
          { fields: ["status"] },
        ],
      }
    );

    const Organization = sequelize.define(
      "Organization",
      {
        organizationId: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          field: "organization_id",
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          validate: { notEmpty: true },
        },
        slug: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
          validate: { notEmpty: true },
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        industryType: {
          type: Sequelize.STRING(100),
          allowNull: true,
          field: "industry_type",
        },
        companySize: {
          type: Sequelize.ENUM(
            "solo",
            "small",
            "medium",
            "large",
            "enterprise"
          ),
          allowNull: true,
          field: "company_size",
        },
        primaryUseCase: {
          type: Sequelize.STRING(100),
          allowNull: true,
          field: "primary_use_case",
        },
        currentTool: {
          type: Sequelize.STRING(100),
          allowNull: true,
          field: "current_tool",
        },
        status: {
          type: Sequelize.ENUM("active", "inactive", "suspended"),
          allowNull: false,
          defaultValue: "active",
        },
        subscriptionStatus: {
          type: Sequelize.ENUM(
            "trial",
            "active",
            "cancelled",
            "past_due",
            "unpaid"
          ),
          defaultValue: "trial",
          field: "subscription_status",
        },
        planType: {
          type: Sequelize.ENUM("trial", "basic", "pro", "enterprise"),
          defaultValue: "trial",
          field: "plan_type",
        },
        trialStartsAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "trial_starts_at",
        },
        trialEndsAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "trial_ends_at",
        },
        maxUsers: {
          type: Sequelize.INTEGER,
          defaultValue: 5,
          field: "max_users",
        },
        maxWorkspaces: {
          type: Sequelize.INTEGER,
          defaultValue: 3,
          field: "max_workspaces",
        },
        featuresEnabled: {
          type: Sequelize.JSON,
          defaultValue: ["contacts", "leads", "basic_reports"],
          field: "features_enabled",
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "created_by",
        },
      },
      {
        tableName: "organizations",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { unique: true, fields: ["slug"] },
          { fields: ["status"] },
          { fields: ["subscription_status"] },
          { fields: ["created_by"] },
        ],
      }
    );

    const UserOrganization = sequelize.define(
      "UserOrganization",
      {
        userOrganizationId: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          field: "user_organization_id",
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "user_id",
        },
        organizationId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "organization_id",
        },
        role: {
          type: Sequelize.ENUM("owner", "admin", "manager", "viewer"),
          allowNull: false,
          defaultValue: "viewer",
        },
        status: {
          type: Sequelize.ENUM("active", "inactive", "pending"),
          allowNull: false,
          defaultValue: "active",
        },
        joinedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
          field: "joined_at",
        },
        invitedBy: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "invited_by",
        },
      },
      {
        tableName: "user_organizations",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { unique: true, fields: ["user_id", "organization_id"] },
          { fields: ["role"] },
          { fields: ["status"] },
          { fields: ["organization_id"] },
        ],
      }
    );

    const UserSession = sequelize.define(
      "UserSession",
      {
        userSessionId: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          field: "user_session_id",
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          unique: true,
          field: "user_id",
        },
        currentOrganizationId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "current_organization_id",
        },
        lastActivityAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
          field: "last_activity_at",
        },
      },
      {
        tableName: "user_sessions",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { unique: true, fields: ["user_id"] },
          { fields: ["current_organization_id"] },
        ],
      }
    );

    const Task = sequelize.define(
      "Task",
      {
        taskId: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          field: "task_id",
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
          validate: { notEmpty: true },
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM(
            "Pending",
            "In Progress",
            "Completed",
            "Cancelled"
          ),
          allowNull: false,
          defaultValue: "Pending",
        },
        priority: {
          type: Sequelize.ENUM("Low", "Medium", "High", "Urgent"),
          allowNull: false,
          defaultValue: "Medium",
        },
        type: {
          type: Sequelize.ENUM(
            "Call",
            "Email",
            "Meeting",
            "Follow-up",
            "Other"
          ),
          allowNull: false,
          defaultValue: "Other",
        },
        dueDate: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "due_date",
        },
        completed: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        completedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "completed_at",
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
        leadId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "lead_id",
        },
        dealId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "deal_id",
        },
        organizationId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "organization_id",
        },
      },
      {
        tableName: "tasks",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { fields: ["status"] },
          { fields: ["priority"] },
          { fields: ["assigned_to"] },
          { fields: ["due_date"] },
          { fields: ["organization_id"] },
        ],
      }
    );

    const Activity = sequelize.define(
      "Activity",
      {
        activityId: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          field: "activity_id",
        },
        type: {
          type: Sequelize.ENUM(
            "call",
            "email",
            "meeting",
            "note",
            "task",
            "deal_update"
          ),
          allowNull: false,
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
          validate: { notEmpty: true },
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        duration: {
          type: Sequelize.INTEGER, // in minutes
          allowNull: true,
        },
        outcome: {
          type: Sequelize.ENUM("positive", "neutral", "negative", "follow_up"),
          allowNull: true,
        },
        scheduledAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "scheduled_at",
        },
        completedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "completed_at",
        },
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "user_id",
        },
        leadId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "lead_id",
        },
        dealId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "deal_id",
        },
        taskId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "task_id",
        },
        organizationId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "organization_id",
        },
      },
      {
        tableName: "activities",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { fields: ["type"] },
          { fields: ["user_id"] },
          { fields: ["lead_id"] },
          { fields: ["deal_id"] },
          { fields: ["organization_id"] },
        ],
      }
    );

    const PipelineStage = sequelize.define(
      "PipelineStage",
      {
        stageId: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          field: "stage_id",
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          validate: { notEmpty: true },
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        color: {
          type: Sequelize.STRING(7), // hex color code
          allowNull: true,
          defaultValue: "#3B82F6",
        },
        position: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          field: "is_active",
        },
        probability: {
          type: Sequelize.INTEGER, // percentage
          allowNull: true,
          defaultValue: 0,
        },
        organizationId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "organization_id",
        },
      },
      {
        tableName: "pipeline_stages",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { fields: ["organization_id"] },
          { fields: ["position"] },
          { fields: ["is_active"] },
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
        companyName: {
          type: Sequelize.STRING(255),
          allowNull: false,
          field: "company_name",
          validate: { notEmpty: true },
        },
        contactPerson: {
          type: Sequelize.STRING(255),
          allowNull: false,
          field: "contact_person",
          validate: { notEmpty: true },
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          validate: { isEmail: true },
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        altEmail: {
          type: Sequelize.STRING(255),
          allowNull: true,
          field: "alt_email",
          validate: { isEmail: true },
        },
        altPhone: {
          type: Sequelize.STRING(50),
          allowNull: true,
          field: "alt_phone",
        },
        website: {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        linkedinCompany: {
          type: Sequelize.STRING(255),
          allowNull: true,
          field: "linkedin_company",
        },
        linkedinProfile: {
          type: Sequelize.STRING(255),
          allowNull: true,
          field: "linkedin_profile",
        },
        industry: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        companySize: {
          type: Sequelize.ENUM("1-10", "11-50", "51-200", "201-500", "500+"),
          allowNull: true,
          field: "company_size",
        },
        status: {
          type: Sequelize.ENUM(
            "New",
            "Contacted",
            "Qualified",
            "Converted",
            "Disqualified"
          ),
          allowNull: false,
          defaultValue: "New",
        },
        source: {
          type: Sequelize.ENUM(
            "Website",
            "Referral",
            "Cold Call",
            "LinkedIn",
            "Email",
            "Trade Show",
            "Advertisement"
          ),
          allowNull: false,
          defaultValue: "Website",
        },
        type: {
          type: Sequelize.ENUM("Hot", "Warm", "Cold"),
          allowNull: false,
          defaultValue: "Warm",
        },
        priority: {
          type: Sequelize.ENUM("High", "Medium", "Low"),
          allowNull: false,
          defaultValue: "Medium",
        },
        dealValue: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "deal_value",
          validate: { min: 0 },
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        lastContactedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "last_contacted_at",
        },
        nextFollowupAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "next_followup_at",
        },
        convertedDealId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "converted_deal_id",
        },
        convertedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "converted_at",
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
        organizationId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "organization_id",
        },
      },
      {
        tableName: "leads",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { fields: ["status"] },
          { fields: ["source"] },
          { fields: ["assigned_to"] },
          { fields: ["organization_id"] },
        ],
      }
    );

    const Deal = sequelize.define(
      "Deal",
      {
        dealId: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          field: "deal_id",
        },
        title: {
          type: Sequelize.STRING(255),
          allowNull: false,
          validate: { notEmpty: true },
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        value: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: "USD",
        },
        stageId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "stage_id",
        },
        probability: {
          type: Sequelize.INTEGER, // percentage
          allowNull: false,
          defaultValue: 0,
        },
        expectedCloseDate: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "expected_close_date",
        },
        actualCloseDate: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "actual_close_date",
        },
        status: {
          type: Sequelize.ENUM("open", "won", "lost", "cancelled"),
          allowNull: false,
          defaultValue: "open",
        },
        leadId: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "lead_id",
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
        organizationId: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "organization_id",
        },
      },
      {
        tableName: "deals",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { fields: ["stage_id"] },
          { fields: ["status"] },
          { fields: ["assigned_to"] },
          { fields: ["organization_id"] },
        ],
      }
    );

    // Setup associations
    User.hasMany(Organization, {
      foreignKey: "created_by",
      as: "createdOrganizations",
    });

    User.hasMany(UserOrganization, {
      foreignKey: "user_id",
      as: "userOrganizations",
    });

    User.hasOne(UserSession, {
      foreignKey: "user_id",
      as: "session",
    });

    User.hasMany(Task, {
      foreignKey: "assigned_to",
      as: "assignedTasks",
    });

    User.hasMany(Task, {
      foreignKey: "created_by",
      as: "createdTasks",
    });

    User.hasMany(Activity, {
      foreignKey: "user_id",
      as: "activities",
    });

    User.hasMany(Lead, {
      foreignKey: "assigned_to",
      as: "assignedLeads",
    });

    User.hasMany(Lead, {
      foreignKey: "created_by",
      as: "createdLeads",
    });

    User.hasMany(Deal, {
      foreignKey: "assigned_to",
      as: "assignedDeals",
    });

    User.hasMany(Deal, {
      foreignKey: "created_by",
      as: "createdDeals",
    });

    Organization.belongsTo(User, {
      foreignKey: "created_by",
      as: "creator",
    });

    Organization.hasMany(UserOrganization, {
      foreignKey: "organization_id",
      as: "userOrganizations",
    });

    Organization.hasMany(Task, {
      foreignKey: "organization_id",
      as: "tasks",
    });

    Organization.hasMany(Activity, {
      foreignKey: "organization_id",
      as: "activities",
    });

    Organization.hasMany(Lead, {
      foreignKey: "organization_id",
      as: "leads",
    });

    Organization.hasMany(Deal, {
      foreignKey: "organization_id",
      as: "deals",
    });

    Organization.hasMany(PipelineStage, {
      foreignKey: "organization_id",
      as: "pipelineStages",
    });

    UserOrganization.belongsTo(User, {
      foreignKey: "user_id",
      as: "user",
    });

    UserOrganization.belongsTo(Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    UserSession.belongsTo(User, {
      foreignKey: "user_id",
      as: "user",
    });

    UserSession.belongsTo(Organization, {
      foreignKey: "current_organization_id",
      as: "currentOrganization",
    });

    Task.belongsTo(User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    Task.belongsTo(User, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    Task.belongsTo(Lead, {
      foreignKey: "lead_id",
      as: "lead",
    });

    Task.belongsTo(Deal, {
      foreignKey: "deal_id",
      as: "deal",
    });

    Task.belongsTo(Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    Activity.belongsTo(User, {
      foreignKey: "user_id",
      as: "user",
    });

    Activity.belongsTo(Lead, {
      foreignKey: "lead_id",
      as: "lead",
    });

    Activity.belongsTo(Deal, {
      foreignKey: "deal_id",
      as: "deal",
    });

    Activity.belongsTo(Task, {
      foreignKey: "task_id",
      as: "task",
    });

    Activity.belongsTo(Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    PipelineStage.belongsTo(Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    PipelineStage.hasMany(Deal, {
      foreignKey: "stage_id",
      as: "deals",
    });

    Lead.belongsTo(User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    Lead.belongsTo(User, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    Lead.belongsTo(Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    Lead.hasMany(Deal, {
      foreignKey: "lead_id",
      as: "deals",
    });

    Lead.hasMany(Task, {
      foreignKey: "lead_id",
      as: "tasks",
    });

    Lead.hasMany(Activity, {
      foreignKey: "lead_id",
      as: "activities",
    });

    Deal.belongsTo(User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    Deal.belongsTo(User, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    Deal.belongsTo(Lead, {
      foreignKey: "lead_id",
      as: "lead",
    });

    Deal.belongsTo(PipelineStage, {
      foreignKey: "stage_id",
      as: "stage",
    });

    Deal.belongsTo(Organization, {
      foreignKey: "organization_id",
      as: "organization",
    });

    Deal.hasMany(Task, {
      foreignKey: "deal_id",
      as: "tasks",
    });

    Deal.hasMany(Activity, {
      foreignKey: "deal_id",
      as: "activities",
    });

    // Sync all tables
    await sequelize.sync({ force: true });
    console.log("✅ All tables created!");

    console.log("\n📋 Tables created:");
    console.log("  - users");
    console.log("  - organizations");
    console.log("  - user_organizations");
    console.log("  - user_sessions");
    console.log("  - tasks");
    console.log("  - activities");
    console.log("  - pipeline_stages");
    console.log("  - leads");
    console.log("  - deals");

    console.log("\n🎉 Comprehensive database setup complete!");
    console.log("\n📋 Features:");
    console.log("  - Multi-organization support");
    console.log("  - Role-based access control");
    console.log("  - Complete CRM functionality");
    console.log("  - Activity tracking");
    console.log("  - Pipeline management");
    console.log("  - Task management");
    console.log("  - Lead and deal management");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();

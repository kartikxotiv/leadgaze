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
    console.log("🚀 Setting up simplified database...");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    // Define models directly in the script for simplicity
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
          validate: {
            isEmail: true,
          },
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false,
          validate: {
            len: [8, 255],
          },
        },
        firstName: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "first_name",
          validate: {
            notEmpty: true,
          },
        },
        lastName: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "last_name",
          validate: {
            notEmpty: true,
          },
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
        tableName: "users",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { unique: true, fields: ["email"] },
          { fields: ["email_verified"] },
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
          validate: {
            notEmpty: true,
          },
        },
        slug: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
          },
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
          type: Sequelize.STRING(50),
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
          type: Sequelize.ENUM("trial", "active", "expired", "cancelled"),
          allowNull: false,
          defaultValue: "trial",
          field: "subscription_status",
        },
        planType: {
          type: Sequelize.ENUM("free", "basic", "pro", "enterprise"),
          allowNull: false,
          defaultValue: "free",
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
          allowNull: false,
          defaultValue: 5,
          field: "max_users",
        },
        maxWorkspaces: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 3,
          field: "max_workspaces",
        },
        featuresEnabled: {
          type: Sequelize.JSONB,
          allowNull: true,
          field: "features_enabled",
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "created_by",
          references: {
            model: "users",
            key: "user_id",
          },
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
          validate: {
            notEmpty: true,
          },
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        type: {
          type: Sequelize.ENUM("Task", "Call", "Email", "Meeting", "Note"),
          allowNull: false,
          defaultValue: "Task",
        },
        priority: {
          type: Sequelize.ENUM("Low", "Medium", "High", "Urgent"),
          allowNull: false,
          defaultValue: "Medium",
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
        dueDate: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "due_date",
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
          references: {
            model: "users",
            key: "user_id",
          },
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "created_by",
          references: {
            model: "users",
            key: "user_id",
          },
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
        tableName: "tasks",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { fields: ["assigned_to"] },
          { fields: ["status"] },
          { fields: ["due_date"] },
          { fields: ["priority"] },
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
          validate: {
            notEmpty: true,
          },
        },
        contactPerson: {
          type: Sequelize.STRING(255),
          allowNull: false,
          field: "contact_person",
          validate: {
            notEmpty: true,
          },
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: true,
          validate: {
            isEmail: true,
          },
        },
        phone: {
          type: Sequelize.STRING(50),
          allowNull: true,
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
        type: {
          type: Sequelize.ENUM("Hot", "Warm", "Cold"),
          allowNull: false,
          defaultValue: "Warm",
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
        },
        dealValue: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "deal_value",
          validate: {
            min: 0,
          },
        },
        assignedTo: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "assigned_to",
          references: {
            model: "users",
            key: "user_id",
          },
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "created_by",
          references: {
            model: "users",
            key: "user_id",
          },
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
          { fields: ["assigned_to"] },
          { fields: ["status"] },
          { fields: ["type"] },
          { fields: ["source"] },
          { fields: ["deal_value"] },
          { fields: ["created_at"] },
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
        dealName: {
          type: Sequelize.STRING(255),
          allowNull: false,
          field: "deal_name",
          validate: {
            notEmpty: true,
          },
        },
        dealValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: "deal_value",
          validate: {
            min: 0,
          },
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: "USD",
        },
        probability: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 50,
          validate: {
            min: 0,
            max: 100,
          },
        },
        weightedValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          field: "weighted_value",
        },
        accountName: {
          type: Sequelize.STRING(255),
          allowNull: false,
          field: "account_name",
          validate: {
            notEmpty: true,
          },
        },
        contactName: {
          type: Sequelize.STRING(255),
          allowNull: false,
          field: "contact_name",
          validate: {
            notEmpty: true,
          },
        },
        contactEmail: {
          type: Sequelize.STRING(255),
          allowNull: false,
          field: "contact_email",
          validate: {
            isEmail: true,
          },
        },
        dealSource: {
          type: Sequelize.STRING(100),
          allowNull: false,
          field: "deal_source",
        },
        dealStatus: {
          type: Sequelize.ENUM("open", "won", "lost", "on_hold"),
          allowNull: false,
          defaultValue: "open",
          field: "deal_status",
        },
        assignedTo: {
          type: Sequelize.UUID,
          allowNull: true,
          field: "assigned_to",
          references: {
            model: "users",
            key: "user_id",
          },
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: false,
          field: "created_by",
          references: {
            model: "users",
            key: "user_id",
          },
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
        tableName: "deals",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          { fields: ["assigned_to"] },
          { fields: ["deal_status"] },
          { fields: ["deal_value"] },
          { fields: ["created_at"] },
        ],
        hooks: {
          beforeSave: async (deal) => {
            // Calculate weighted value
            deal.weightedValue = (deal.dealValue * deal.probability) / 100;
          },
        },
      }
    );

    // Setup associations
    User.hasMany(Organization, {
      foreignKey: "created_by",
      as: "createdOrganizations",
    });

    User.hasMany(Task, {
      foreignKey: "assigned_to",
      as: "assignedTasks",
    });

    User.hasMany(Task, {
      foreignKey: "created_by",
      as: "createdTasks",
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

    Task.belongsTo(User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    Task.belongsTo(User, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    Lead.belongsTo(User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    Lead.belongsTo(User, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    Deal.belongsTo(User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    Deal.belongsTo(User, {
      foreignKey: "created_by",
      as: "createdUser",
    });

    // Sync all tables
    await sequelize.sync({ force: true });
    console.log("✅ All tables created!");

    console.log("\n📋 Tables created:");
    console.log("  - users");
    console.log("  - organizations");
    console.log("  - tasks");
    console.log("  - leads");
    console.log("  - deals");

    console.log("\n🎉 Simplified database setup complete!");
    console.log("\n📋 Features:");
    console.log("  - Clean, simple model definitions");
    console.log("  - Proper associations");
    console.log("  - Database indexes for performance");
    console.log("  - Validation rules");
    console.log("  - Hooks for business logic");
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await sequelize.close();
  }
}

setupDatabase();

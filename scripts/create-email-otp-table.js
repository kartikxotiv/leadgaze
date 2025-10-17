const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: console.log,
});

const EmailOTP = sequelize.define("EmailOTP", {
  id: {
    type: Sequelize.UUID,
    primaryKey: true,
    defaultValue: Sequelize.UUIDV4,
  },
  email: {
    type: Sequelize.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },
  otp: {
    type: Sequelize.STRING(6),
    allowNull: false,
    validate: {
      len: [6, 6],
      isNumeric: true,
    },
  },
  purpose: {
    type: Sequelize.ENUM("signup", "password_reset", "login"),
    allowNull: false,
    defaultValue: "signup",
  },
  attempts: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 5,
    },
  },
  expiresAt: {
    type: Sequelize.DATE,
    allowNull: false,
    field: "expires_at",
  },
  verifiedAt: {
    type: Sequelize.DATE,
    allowNull: true,
    field: "verified_at",
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
}, {
  tableName: "email_otps",
  timestamps: false,
  indexes: [
    { fields: ["email"] },
    { fields: ["email", "purpose"] },
    { fields: ["expires_at"] },
    { unique: true, fields: ["email", "otp", "purpose"] },
  ],
});

async function createEmailOTPTable() {
  try {
    console.log("🔄 Creating EmailOTP table...");
    
   
    await sequelize.authenticate();
    console.log("✅ Database connection established.");
    
   
    await EmailOTP.sync({ force: false });
    console.log("✅ EmailOTP table created successfully!");
    
    console.log("📋 Table created: email_otps");
    console.log("🎉 EmailOTP table setup complete!");
    
  } catch (error) {
    console.error("❌ Failed to create EmailOTP table:", error);
  } finally {
    await sequelize.close();
  }
}

createEmailOTPTable();
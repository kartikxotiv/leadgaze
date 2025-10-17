import { DataTypes, Sequelize } from "sequelize";
import bcrypt from "bcryptjs";

export default (sequelize: Sequelize) => {
  const User = sequelize.define(
    "User",
    {
      userId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "user_id",
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [8, 255],
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
      phoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: "phone_number",
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "email_verified",
      },
     
      statusId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "status_id",
        references: {
          model: "users_config",
          key: "id",
        },
      },

      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_login",
      },
      loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: "login_attempts",
      },
      lockUntil: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "lock_until",
      },
      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "password_reset_token",
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "password_reset_expires",
      },
      passwordChangedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "password_changed_at",
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
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["email"] },
        { fields: ["email_verified"] },
        { fields: ["status_id"] },
      ],
      hooks: {
        beforeCreate: async (user: any) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        },
        beforeUpdate: async (user: any) => {
          if (user.changed("password")) {
            user.password = await bcrypt.hash(user.password, 12);
          }
        },
      },
    }
  );

 
  (User as any).findByEmail = function (email: string) {
    return this.findOne({
      where: {
        email: email.toLowerCase(),
      },
    });
  };

  (User as any).findActiveUsers = function () {
    return this.findAll({
      include: [
        {
          association: "statusConfig",
          required: true,
          where: {
            entityType: "status",
            entityValue: "active",
            isActive: true,
          },
        },
      ],
    });
  };

 
  (User as any).validatePassword = async function (
    user: any,
    password: string
  ) {
    return bcrypt.compare(password, user.password);
  };

  (User as any).isLocked = function (user: any) {
    return !!(user.lockUntil && user.lockUntil > new Date());
  };

  (User as any).incrementLoginAttempts = async function (user: any) {
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000;

   
    if (user.lockUntil && user.lockUntil < new Date()) {
      await user.update({
        loginAttempts: 1,
        lockUntil: null,
      });
      return;
    }

    const updates: any = {
      loginAttempts: user.loginAttempts + 1,
    };

   
    if (updates.loginAttempts >= maxAttempts && !(User as any).isLocked(user)) {
      updates.lockUntil = new Date(Date.now() + lockTime);
    }

    await user.update(updates);
  };

  (User as any).resetLoginAttempts = async function (user: any) {
    await user.update({
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date(),
    });
  };

  (User as any).getPublicInfo = function (user: any) {
    return {
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      statusId: user.statusId,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  };

 
  (User as any).associate = (models: any) => {
    User.hasMany(models.Organization, {
      foreignKey: "created_by",
      as: "createdOrganizations",
    });
    User.hasMany(models.UserOrganization, {
      foreignKey: "user_id",
      as: "userOrganizations",
    });
    User.hasOne(models.UserSession, {
      foreignKey: "user_id",
      as: "session",
    });

   
    User.hasMany(models.UserInvitation, {
      foreignKey: "invited_by",
      as: "sentInvitations",
    });
    User.hasMany(models.EmailVerification, {
      foreignKey: "user_id",
      as: "emailVerifications",
    });
    User.hasMany(models.PasswordResetToken, {
      foreignKey: "user_id",
      as: "passwordResetTokens",
    });

   
    User.belongsTo(models.UserConfig, {
      foreignKey: "status_id",
      as: "statusConfig",
    });
  };

  return User;
};

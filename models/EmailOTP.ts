import { DataTypes, Sequelize, Op } from "sequelize";

export default (sequelize: Sequelize) => {
  const EmailOTP = sequelize.define(
    "EmailOTP",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      otp: {
        type: DataTypes.STRING(6),
        allowNull: false,
        validate: {
          len: [6, 6],
          isNumeric: true,
        },
      },
      purpose: {
        type: DataTypes.ENUM("signup", "password_reset", "login"),
        allowNull: false,
        defaultValue: "signup",
      },
      attempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 5,
        },
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "expires_at",
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "verified_at",
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
      tableName: "email_otps",
      timestamps: false,
      indexes: [
        { fields: ["email"] },
        { fields: ["email", "purpose"] },
        { fields: ["expires_at"] },
        { unique: true, fields: ["email", "otp", "purpose"] },
      ],
    }
  );

 
  (EmailOTP as any).prototype.isExpired = function () {
    return new Date() > this.expiresAt;
  };

  (EmailOTP as any).prototype.isVerified = function () {
    return this.verifiedAt !== null;
  };

  (EmailOTP as any).prototype.canAttempt = function () {
    return this.attempts < 5 && !this.isExpired() && !this.isVerified();
  };

  (EmailOTP as any).prototype.incrementAttempts = function () {
    this.attempts += 1;
    this.updatedAt = new Date();
    return this.save();
  };

  (EmailOTP as any).prototype.markVerified = function () {
    this.verifiedAt = new Date();
    this.updatedAt = new Date();
    return this.save();
  };

 
  (EmailOTP as any).generateOTP = function () {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  (EmailOTP as any).createOTP = function (
    email: string,
    purpose: string = "signup",
    expirationMinutes: number = 10
  ) {
    const otp = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    return this.create({
      email: email.toLowerCase().trim(),
      otp,
      purpose,
      expiresAt,
      attempts: 0,
    });
  };

  (EmailOTP as any).findValidOTP = function (
    email: string,
    otp: string,
    purpose: string = "signup"
  ) {
    return this.findOne({
      where: {
        email: email.toLowerCase().trim(),
        otp,
        purpose,
        verifiedAt: null,
        expiresAt: {
          [Op.gt]: new Date(),
        },
        attempts: {
          [Op.lt]: 5,
        },
      },
    });
  };

  (EmailOTP as any).findLatestOTP = function (
    email: string,
    purpose: string = "signup"
  ) {
    return this.findOne({
      where: {
        email: email.toLowerCase().trim(),
        purpose,
      },
      order: [["createdAt", "DESC"]],
    });
  };

  (EmailOTP as any).invalidateOTPs = function (
    email: string,
    purpose: string = "signup"
  ) {
    return this.update(
      {
        verifiedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        where: {
          email: email.toLowerCase().trim(),
          purpose,
          verifiedAt: null,
        },
      }
    );
  };

  (EmailOTP as any).cleanupExpired = function () {
    return this.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  };

  return EmailOTP;
};

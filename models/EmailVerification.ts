import { DataTypes, Sequelize } from "sequelize";
import crypto from "crypto";

export default (sequelize: Sequelize) => {
  const EmailVerification = sequelize.define(
    "EmailVerification",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
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
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
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
    },
    {
      tableName: "email_verifications",
      timestamps: false,
      indexes: [
        { unique: true, fields: ["token"] },
        { fields: ["user_id"] },
        { fields: ["expires_at"] },
      ],
    }
  );

 
  (EmailVerification as any).prototype.isExpired = function () {
    return new Date() > this.expiresAt;
  };

  (EmailVerification as any).prototype.isVerified = function () {
    return this.verifiedAt !== null;
  };

  (EmailVerification as any).prototype.markVerified = function () {
    this.verifiedAt = new Date();
    return this.save();
  };

 
  (EmailVerification as any).createVerification = function (userId: string) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return this.create({
      userId,
      token,
      expiresAt,
    });
  };

  (EmailVerification as any).findByToken = function (token: string) {
    return this.findOne({
      where: {
        token,
      },
      include: [
        {
          association: "user",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
      ],
    });
  };

  (EmailVerification as any).findValidByUserId = function (userId: string) {
    return this.findOne({
      where: {
        userId,
        verifiedAt: null,
        expiresAt: {
          [sequelize.Op.gt]: new Date(),
        },
      },
    });
  };

  (EmailVerification as any).cleanupExpired = function () {
    return this.destroy({
      where: {
        expiresAt: {
          [sequelize.Op.lt]: new Date(),
        },
      },
    });
  };

 
  (EmailVerification as any).associate = (models: any) => {
    EmailVerification.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return EmailVerification;
};

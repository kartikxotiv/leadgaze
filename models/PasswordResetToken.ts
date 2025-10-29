import { DataTypes, Sequelize, Op } from "sequelize";
import crypto from "crypto";

export default (sequelize: Sequelize) => {
  const PasswordResetToken = sequelize.define(
    "PasswordResetToken",
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
     
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at",
      },
    },
    {
      tableName: "password_reset_tokens",
      timestamps: false,
      indexes: [
        { unique: true, fields: ["token"] },
        { fields: ["user_id"] },
        { fields: ["expires_at"] },
      ],
    }
  );

 
  (PasswordResetToken as any).prototype.isExpired = function () {
    return new Date() > this.expiresAt;
  };

  (PasswordResetToken as any).prototype.isUsed = function () {
   
    return false;
  };

  (PasswordResetToken as any).prototype.markUsed = function () {
   
    return this.destroy();
  };

 
  (PasswordResetToken as any).createResetToken = function (userId: string) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    return this.create({
      userId,
      token,
      expiresAt,
    });
  };

  (PasswordResetToken as any).findByToken = function (token: string) {
    return this.findOne({
      where: {
        token,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
      include: [
        {
          association: "user",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
      ],
    });
  };

  (PasswordResetToken as any).findValidByUserId = function (userId: string) {
    return this.findOne({
      where: {
        userId,
        expiresAt: {
          [Op.gt]: new Date(),
        },
      },
    });
  };

  (PasswordResetToken as any).invalidateAllForUser = function (userId: string) {
   
    return this.destroy({ where: { userId } });
  };

  (PasswordResetToken as any).cleanupExpired = function () {
    return this.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
  };

 
  (PasswordResetToken as any).associate = (models: any) => {
    PasswordResetToken.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return PasswordResetToken;
};

import { DataTypes, Model, Sequelize } from "sequelize";

export class OrgUserAccount extends Model {}

export function initOrgUserAccount(sequelize: Sequelize) {
  OrgUserAccount.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organizationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "organization_id",
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "password_hash",
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "first_name",
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "last_name",
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active",
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_login",
      },
    },
    {
      sequelize,
      tableName: "org_user_accounts",
      indexes: [
        { unique: true, fields: ["organization_id", "email"] },
        { fields: ["email"] },
      ],
      underscored: true,
    }
  );

  return OrgUserAccount;
}

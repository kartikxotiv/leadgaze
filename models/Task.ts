import { DataTypes, Sequelize } from "sequelize";

export default (sequelize: Sequelize) => {
  const Task = sequelize.define(
    "Task",
    {
      taskId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: "task_id",
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM("Task", "Call", "Email", "Meeting", "Note"),
        allowNull: false,
        defaultValue: "Task",
      },
      priority: {
        type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"),
        allowNull: false,
        defaultValue: "Medium",
      },
      status: {
        type: DataTypes.ENUM(
          "Pending",
          "In Progress",
          "Completed",
          "Cancelled"
        ),
        allowNull: false,
        defaultValue: "Pending",
      },
      dueDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "due_date",
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "completed_at",
      },
      leadId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "lead_id",
        references: {
          model: "leads",
          key: "lead_id",
        },
      },
      dealId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "deal_id",
        references: {
          model: "deals",
          key: "deal_id",
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
      tableName: "tasks",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["assigned_to"] },
        { fields: ["lead_id"] },
        { fields: ["deal_id"] },
        { fields: ["status"] },
        { fields: ["due_date"] },
        { fields: ["priority"] },
      ],
      hooks: {
        beforeUpdate: async (task: any) => {
          if (
            task.changed("status") &&
            task.status === "Completed" &&
            !task.completedAt
          ) {
            task.completedAt = new Date();
          }
        },
      },
    }
  );

 
  (Task as any).associate = (models: any) => {
    Task.belongsTo(models.User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });
    Task.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "createdUser",
    });
   
   
   
   
   
    Task.belongsTo(models.Deal, {
      foreignKey: "deal_id",
      as: "deal",
    });
  };

  return Task;
};

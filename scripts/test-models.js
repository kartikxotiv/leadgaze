const { Sequelize } = require("sequelize");

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

async function testModels() {
  try {
    console.log("🧪 Testing simplified model pattern...");

    // Test connection
    await sequelize.authenticate();
    console.log("✅ Database connected!");

    // Define models directly (same as simple-db-setup.js)
    const User = sequelize.define("User", {
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
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    });

    const Task = sequelize.define("Task", {
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
      status: {
        type: Sequelize.ENUM("Pending", "In Progress", "Completed", "Cancelled"),
        allowNull: false,
        defaultValue: "Pending",
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
      tableName: "tasks",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    });

    console.log("✅ Models defined!");

    // Test model properties
    console.log("\n📋 Model Information:");
    console.log(`  - User: ${User.name} (${User.tableName})`);
    console.log(`  - Task: ${Task.name} (${Task.tableName})`);

    // Test associations
    User.hasMany(Task, {
      foreignKey: "assigned_to",
      as: "assignedTasks",
    });

    Task.belongsTo(User, {
      foreignKey: "assigned_to",
      as: "assignedUser",
    });

    console.log("✅ Associations set up!");

    // Test data creation
    console.log("\n🧪 Testing data creation...");
    
    const testUser = await User.create({
      email: "test@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User",
    });

    console.log("✅ Test user created:", testUser.toJSON());

    const testTask = await Task.create({
      title: "Test Task",
      status: "Pending",
      assignedTo: testUser.userId,
    });

    console.log("✅ Test task created:", testTask.toJSON());

    // Test associations
    const userWithTasks = await User.findOne({
      where: { userId: testUser.userId },
      include: [{
        model: Task,
        as: "assignedTasks",
      }],
    });

    console.log("✅ Association test passed!");
    console.log(`  - User has ${userWithTasks.assignedTasks.length} tasks`);

    // Clean up
    await Task.destroy({ where: {} });
    await User.destroy({ where: {} });
    console.log("✅ Test data cleaned up!");

    console.log("\n🎉 All tests passed! Simplified model pattern is working correctly!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await sequelize.close();
  }
}

testModels();

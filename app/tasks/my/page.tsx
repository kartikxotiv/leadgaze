"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/hooks/use-tasks";
import { useUsers } from "@/hooks/use-users";
import { Plus, Calendar, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function MyTasksPage() {
  const { tasks, updateTask } = useTasks();
  const { currentUser } = useUsers();

 
  const myTasks = tasks.filter((task) => task.assigned_to === currentUser?.id);
  const pendingTasks = myTasks.filter((task) => !task.completed);
  const completedTasks = myTasks.filter((task) => task.completed);
  const overdueTasks = myTasks.filter(
    (task) =>
      !task.completed && task.due_date && new Date(task.due_date) < new Date()
  );
  const todayTasks = myTasks.filter(
    (task) =>
      !task.completed &&
      task.due_date &&
      new Date(task.due_date).toDateString() === new Date().toDateString()
  );

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      await updateTask(taskId, {
        completed,
        status: completed ? "Completed" : "Pending",
      });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Call":
        return "📞";
      case "Meeting":
        return "🤝";
      case "Email":
        return "📧";
      case "Task":
        return "✅";
      default:
        return "📝";
    }
  };

  return (
    <DashboardLayout
      title="My Tasks"
      description={`Your personal task list - ${pendingTasks.length} pending tasks`}
      actions={
        <Button asChild>
          <Link href="/tasks/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                Due Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overdueTasks.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        {}
        {todayTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Due Today
              </CardTitle>
              <CardDescription>
                Tasks that need your attention today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-orange-50"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) =>
                        handleTaskToggle(task.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getTypeIcon(task.type)}
                        </span>
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      {task.lead && (
                        <p className="text-sm text-blue-600 mt-1">
                          Related to: {task.lead.company_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {}
        {overdueTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Clock className="w-5 h-5" />
                Overdue Tasks
              </CardTitle>
              <CardDescription>
                Tasks that are past their due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-red-50"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) =>
                        handleTaskToggle(task.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getTypeIcon(task.type)}
                        </span>
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge variant="destructive">Overdue</Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <p className="text-sm text-red-600 mt-1">
                        Due:{" "}
                        {task.due_date
                          ? format(new Date(task.due_date), "MMM dd, yyyy")
                          : "No due date"}
                      </p>
                      {task.lead && (
                        <p className="text-sm text-blue-600 mt-1">
                          Related to: {task.lead.company_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {}
        <Card>
          <CardHeader>
            <CardTitle>All Pending Tasks</CardTitle>
            <CardDescription>
              Your complete list of pending tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  All caught up! No pending tasks.
                </p>
                <Button asChild>
                  <Link href="/tasks/new">Create New Task</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) =>
                        handleTaskToggle(task.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getTypeIcon(task.type)}
                        </span>
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {task.due_date && (
                          <span>
                            Due:{" "}
                            {format(new Date(task.due_date), "MMM dd, yyyy")}
                          </span>
                        )}
                        {task.lead && (
                          <span className="text-blue-600">
                            Related to: {task.lead.company_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {}
        {completedTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Completed Tasks
              </CardTitle>
              <CardDescription>Tasks you've completed recently</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 border rounded-lg opacity-60"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(checked) =>
                        handleTaskToggle(task.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getTypeIcon(task.type)}
                        </span>
                        <h4 className="font-medium line-through">
                          {task.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800"
                        >
                          Completed
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-through">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {completedTasks.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    And {completedTasks.length - 5} more completed tasks...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

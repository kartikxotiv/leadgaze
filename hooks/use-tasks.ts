"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/lib/types";

const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Follow up with TechCorp Solutions",
    description: "Call John Smith to discuss enterprise solution requirements",
    type: "Call",
    priority: "High",
    status: "Pending",
    due_date: "2024-01-20T10:00:00Z",
    completed: false,
    completed_at: undefined,
    lead_id: "1",
    deal_id: undefined,
    assigned_to: "user-1",
    created_by: "user-1",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "task-2",
    title: "Send proposal to Global Manufacturing",
    description:
      "Prepare and send detailed proposal for manufacturing solution",
    type: "Email",
    priority: "High",
    status: "In Progress",
    due_date: "2024-01-19T17:00:00Z",
    completed: false,
    completed_at: undefined,
    lead_id: "2",
    deal_id: "deal-1",
    assigned_to: "user-2",
    created_by: "user-1",
    created_at: "2024-01-14T14:30:00Z",
    updated_at: "2024-01-17T09:15:00Z",
  },
  {
    id: "task-3",
    title: "Demo preparation for StartupXYZ",
    description: "Prepare demo environment and presentation materials",
    type: "Task",
    priority: "Medium",
    status: "Scheduled",
    due_date: "2024-01-22T14:00:00Z",
    completed: false,
    completed_at: undefined,
    lead_id: "3",
    deal_id: undefined,
    assigned_to: "user-3",
    created_by: "user-2",
    created_at: "2024-01-13T16:45:00Z",
    updated_at: "2024-01-17T11:20:00Z",
  },
  {
    id: "task-4",
    title: "Contract review with Enterprise Corp",
    description: "Review final contract terms and prepare for signing",
    type: "Meeting",
    priority: "High",
    status: "Completed",
    due_date: "2024-01-18T11:00:00Z",
    completed: true,
    completed_at: "2024-01-18T15:30:00Z",
    lead_id: "4",
    deal_id: "deal-2",
    assigned_to: "user-1",
    created_by: "user-3",
    created_at: "2024-01-10T08:00:00Z",
    updated_at: "2024-01-18T15:30:00Z",
  },
  {
    id: "task-5",
    title: "Research Local Business requirements",
    description: "Understand their specific needs before disqualification",
    type: "Note",
    priority: "Low",
    status: "Cancelled",
    due_date: "2024-01-16T12:00:00Z",
    completed: false,
    completed_at: undefined,
    lead_id: "5",
    deal_id: undefined,
    assigned_to: "user-2",
    created_by: "user-1",
    created_at: "2024-01-12T12:15:00Z",
    updated_at: "2024-01-16T14:45:00Z",
  },
];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem("crm-tasks");
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      } else {
        setTasks(mockTasks);
        localStorage.setItem("crm-tasks", JSON.stringify(mockTasks));
      }
    } catch (err) {
      console.error("Error loading tasks:", err);
      setTasks(mockTasks);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced localStorage saves to improve performance
  useEffect(() => {
    if (tasks.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem("crm-tasks", JSON.stringify(tasks));
      }, 500); // 500ms debounce
      return () => clearTimeout(timeoutId);
    }
  }, [tasks]);

  const addTask = async (taskData: Partial<Task>) => {
    try {
      setLoading(true);
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: taskData.title || "",
        description: taskData.description || "",
        type: taskData.type || "Task",
        priority: taskData.priority || "Medium",
        status: taskData.status || "Pending",
        due_date: taskData.due_date,
        completed: taskData.completed || false,
        completed_at: taskData.completed_at,
        lead_id: taskData.lead_id,
        deal_id: taskData.deal_id,
        assigned_to: taskData.assigned_to,
        created_by: taskData.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTasks((prev) => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add task");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      setLoading(true);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === id
            ? { ...task, ...updates, updated_at: new Date().toISOString() }
            : task
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      setLoading(true);
      setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getOverdueTasks = () => {
    const now = new Date();
    return tasks.filter(
      (task) =>
        !task.completed && task.due_date && new Date(task.due_date) < now
    );
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  const getMyTasks = (userId: string) => {
    return tasks.filter((task) => task.assigned_to === userId);
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    getOverdueTasks,
    getTasksByStatus,
    getMyTasks,
  };
}

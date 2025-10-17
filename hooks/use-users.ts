"use client";

import { useState, useEffect } from "react";
import type { User } from "../lib/types";

const mockUsers: User[] = [
  {
    id: "user-1",
    email: "admin@company.com",
    name: "Admin User",
    role: "Admin",
    avatar: "/placeholder.svg?height=40&width=40",
    phone: "+1 (555) 000-0001",
    department: "Management",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "user-2",
    email: "john.doe@company.com",
    name: "John Doe",
    role: "BDM",
    avatar: "/placeholder.svg?height=40&width=40",
    phone: "+1 (555) 000-0002",
    department: "Sales",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "user-3",
    email: "jane.smith@company.com",
    name: "Jane Smith",
    role: "SDR",
    avatar: "/placeholder.svg?height=40&width=40",
    phone: "+1 (555) 000-0003",
    department: "Sales",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "user-4",
    email: "manager@company.com",
    name: "Sales Manager",
    role: "Manager",
    avatar: "/placeholder.svg?height=40&width=40",
    phone: "+1 (555) 000-0004",
    department: "Sales",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem("crm-users");
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      } else {
        setUsers(mockUsers);
        localStorage.setItem("crm-users", JSON.stringify(mockUsers));
      }
    } catch (err) {
      console.error("Error loading users:", err);
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserById = (id: string) => {
    return users.find((user) => user.id === id);
  };

  const getUsersByRole = (role: string) => {
    return users.filter((user) => user.role === role);
  };

 
  const currentUser = users.find((user) => user.role === "Admin") || users[0];

  return {
    users,
    currentUser,
    loading,
    error,
    getUserById,
    getUsersByRole,
  };
}

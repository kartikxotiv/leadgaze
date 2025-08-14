"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import { Button } from "@/components/ui/button";
import { SafeScrollArea } from "@/components/ui/scroll-area-safe";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Users,
  Target,
  CheckSquare,
  MessageSquare,
  BarChart3,
  Settings,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Zap,
  Megaphone,
} from "lucide-react";

interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface DashboardSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const defaultMenuItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/pages/dashboard",
    icon: Home,
  },
  {
    id: "leads",
    label: "Leads",
    href: "/pages/leads",
    icon: Users,
    badge: "42",
    badgeVariant: "secondary",
  },
  {
    id: "deals",
    label: "Deals",
    href: "/deals",
    icon: Target,
    badge: "8",
    badgeVariant: "default",
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    badge: "8",
    badgeVariant: "destructive",
  },
  {
    id: "pipeline",
    label: "Pipeline",
    href: "/pages/pipeline",
    icon: BarChart3,
  },
  {
    id: "communications",
    label: "Communications",
    href: "/pages/communications",
    icon: MessageSquare,
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/pages/marketing",
    icon: Megaphone,
  },
  {
    id: "team",
    label: "Team",
    href: "/pages/team",
    icon: Users,
  },
  {
    id: "reports",
    label: "Reports",
    href: "/pages/reports",
    icon: BarChart3,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/pages/settings",
    icon: Settings,
  },
];

export function DashboardSidebar({
  collapsed,
  onCollapsedChange,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState<SidebarItem[]>(defaultMenuItems);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Load saved menu order from localStorage
  useEffect(() => {
    // Clear any corrupted data and start fresh
    localStorage.removeItem("sidebar-menu-order");
    setMenuItems(defaultMenuItems);
  }, []);

  // Save menu order to localStorage
  const saveMenuOrder = useCallback((items: SidebarItem[]) => {
    // Only save the order and basic properties, not the icon functions
    const itemsToSave = items.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      badge: item.badge,
      badgeVariant: item.badgeVariant,
    }));
    localStorage.setItem("sidebar-menu-order", JSON.stringify(itemsToSave));
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();

      if (!draggedItem || draggedItem === targetId) {
        setDraggedItem(null);
        return;
      }

      setMenuItems((prevItems) => {
        const newItems = [...prevItems];
        const draggedIndex = newItems.findIndex(
          (item) => item.id === draggedItem
        );
        const targetIndex = newItems.findIndex((item) => item.id === targetId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const [draggedElement] = newItems.splice(draggedIndex, 1);
          newItems.splice(targetIndex, 0, draggedElement);
          saveMenuOrder(newItems);
          return newItems;
        }
        return prevItems;
      });

      setDraggedItem(null);
    },
    [draggedItem, saveMenuOrder]
  );

  const isActive = useCallback(
    (href: string) => {
      if (href === "/pages/dashboard") {
        return pathname === href;
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <div
      className={`fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              MyCRM
            </span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCollapsedChange(!collapsed)}
          className="p-1.5"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Organization Switcher */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
          <OrganizationSwitcher />

          <WorkspaceSwitcher />
        </div>
      )}

      {/* Navigation Menu */}
      <div className="flex-1 overflow-hidden">
        <SafeScrollArea className="h-full px-3 py-4">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <div
                key={item.id}
                draggable={!collapsed}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                className="group relative"
              >
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {/* Drag Handle */}
                  {!collapsed && (
                    <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                  )}

                  {/* Icon */}
                  {(() => {
                    const Icon = item.icon as React.ElementType;
                    return (
                      <Icon
                        className={`w-5 h-5 ${collapsed ? "mx-auto" : ""}`}
                      />
                    );
                  })()}

                  {/* Label and Badge */}
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span>{item.label}</span>
                      {item.badge && (
                        <Badge
                          variant={item.badgeVariant || "secondary"}
                          className="ml-auto text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  )}
                </Link>

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                    {item.badge && ` (${item.badge})`}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </SafeScrollArea>
      </div>

      {/* Sidebar Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Drag items to reorder menu
          </div>
        </div>
      )}
    </div>
  );
}

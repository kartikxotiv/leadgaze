"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";


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
  Building,
  Zap,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  ChevronDown,
  Plus,
  UserPlus,
  } from "lucide-react";
// import Image from "next/image";



interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  children?: SidebarItem[];
}

interface DashboardSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const logo = "/image/leadgaze.png";
const logoicon = "/image/leadgaze_icon.png";

const defaultMenuItems: SidebarItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/pages/dashboard",
    icon: Home,
  },
  {
    id: "CRM",
    label: "Sales Ops",
    href: "#",
    icon: Settings,
    children: [
        {
          id: "companies",
          label: "Companies",
          href: "/pages/companies",
          icon: Users,
        },
        {
          id: "Contacts",
          label: "Contacts",
          href: "/pages/contacts",
          icon: Plus,
        },
        {
          id: "leads",
          label: "Leads",
          href: "/pages/leads",
          icon: UserPlus,
        },
        {
          id: "Deals",
          label: "Deals",
          href: "/pages/deals",
          icon: UserPlus,
        },
        {
          id: "Pipeline",
          label: "Pipeline",
          href: "/pages/pipeline",
          icon: UserPlus,
        },
    ],  
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    badgeVariant: "destructive",
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
    children: [
        {
          id: "team-management",
          label: "Sales Team",
          href: "#",
          icon: Users,
          children: [
            {
              id: "create-organization",
              label: "Create New Organization",
              href: "/pages/settings/create-organization",
              icon: Plus,
            },
            {
              id: "manage-team",
              label: "Manage Team",
              href: "/pages/settings/manage-team",
              icon: UserPlus,
            },
          ],
        },
        {
          id: "select-workspace",
          label: "Select Workspace" ,
          href: "#",
          icon: Users,
          children: [
            {
              id: "Create-Workspace",
              label: "Create a Organization",
              href: "/pages/settings/create-organization",
              icon: Plus,
            },
            {
              id: "manage-workspace",
              label: "Manage Workspaces",
              href: "/pages/settings/manage-team",
              icon: UserPlus,
            },           
          ],
        },
    ],  
  },
];

export function DashboardSidebar({
  collapsed,
  onCollapsedChange,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [menuItems, setMenuItems] = useState<SidebarItem[]>(defaultMenuItems);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

 
  useEffect(() => {
   
    localStorage.removeItem("sidebar-menu-order");
    setMenuItems(defaultMenuItems);
  }, []);

 
  const saveMenuOrder = useCallback((items: SidebarItem[]) => {
   
    const itemsToSave = items.map((item) => ({
      id: item.id,
      label: item.label,
      href: item.href,
      badge: item.badge,
      badgeVariant: item.badgeVariant,
    }));
    localStorage.setItem("sidebar-menu-order", JSON.stringify(itemsToSave));
  }, []);

 
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

  const toggleDropdown = useCallback((itemId: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

 
  const renderMenuItem = useCallback((item: SidebarItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openDropdowns.has(item.id);
    const marginLeft = level * 24;

    return (
      <div key={item.id} className="group relative">
        {}
        <div
          draggable={!collapsed && !hasChildren}
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, item.id)}
          className="group relative"
        >
          {hasChildren ? (
            <button
              onClick={() => toggleDropdown(item.id)}
              className={`flex items-center  gap-3 px-3 py-1 rounded-lg text-sm font-medium transition-colors w-full ${
                isActive(item.href)
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              style={{ marginLeft: `${marginLeft}px` }}
            >
              
              {(() => {
                const Icon = item.icon as React.ElementType;
                return (
                  <Icon
                    className={`w-4 h-4 ${collapsed ? "mx-auto" : ""}`}
                  />
                );
              })()}

              {}
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 font-regular text-[12px]">
                  <span>{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <Badge
                        variant={item.badgeVariant || "secondary"}
                        className="text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronDown 
                      className={`w-4 h-4 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`} 
                    />
                  </div>
                </div>
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-1 uronded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              style={{ marginLeft: `${marginLeft}px` }}
            >
              {}
              {/* {!collapsed && level === 0 && (
                <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
              )} */}

              {}
              {(() => {
                const Icon = item.icon as React.ElementType;
                return (
                  <Icon
                    className={`w-4 h-4 ${collapsed ? "mx-auto" : ""}`}
                  />
                );
              })()}

              {}
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 font-regular text-[13px]">
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
          )}

          
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {item.label}
              {item.badge && ` (${item.badge})`}
            </div>
          )}
        </div>

        
        {hasChildren && !collapsed && isOpen && (
          <div className="space-y-1 mt-2">
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [collapsed, openDropdowns, isActive, toggleDropdown, handleDragStart, handleDragOver, handleDrop]);

  return (
    <div
      className={`fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {}
      <div className="flex  p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex gap-2">
            {/* <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 dark:text-white">
              MyCRM  
            </span> */}
               <Image src={logo} alt="Leadgaze CRM" width={150} height={45} />
          </div>
        )}  
        {collapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            {/* <Zap className="w-5 h-5 text-white" /> */}
            <Image src={logoicon} alt="Leadgaze CRM" width={150} height={45} />
            
          </div>
        )}
      </div>

      
      <div className="flex-1 overflow-hidden">
        <SafeScrollArea className="h-full px-3 py-4">
          <nav className="space-y-1">
            {menuItems.map((item) => renderMenuItem(item))}
          </nav>
        </SafeScrollArea>
      </div>

      
    </div>
  );
}

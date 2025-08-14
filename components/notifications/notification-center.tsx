"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafeScrollArea } from "@/components/ui/scroll-area-safe";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCircle2,
  Trash2,
  Settings,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  getNotificationIcon,
  getPriorityColor,
  formatNotificationTime,
  type Notification,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const handleAction = () => {
    if (!notification.isRead) {
      onMarkRead(notification.notificationId);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg p-3 border transition-all hover:shadow-sm",
        notification.isRead
          ? "bg-gray-50 border-gray-200"
          : "bg-blue-50 border-blue-200"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-lg">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4
                className={cn(
                  "text-sm font-medium",
                  !notification.isRead && "text-blue-900"
                )}
              >
                {notification.title}
              </h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {notification.message}
              </p>

              {/* Priority Badge */}
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs h-5",
                    getPriorityColor(notification.priority)
                  )}
                >
                  {notification.priority}
                </Badge>
                <span className="text-xs text-gray-500">
                  {formatNotificationTime(notification.createdAt)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-2">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notification.notificationId);
                  }}
                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                  title="Mark as read"
                >
                  <CheckCircle2 className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.notificationId);
                }}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Action Button */}
          {notification.actionUrl && notification.actionLabel && (
            <div className="mt-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={handleAction}
              >
                <Link href={notification.actionUrl}>
                  {notification.actionLabel}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Mock data for now (hooks will work once API is set up)
  const mockNotifications = [
    {
      notificationId: "1",
      type: "lead_scored_high",
      title: "🔥 High-Value Lead Alert",
      message: "John Doe scored 85 points - high conversion potential!",
      priority: "high" as const,
      isRead: false,
      createdAt: new Date().toISOString(),
      actionUrl: "/pages/leads/1",
      actionLabel: "View Lead",
    },
    {
      notificationId: "2",
      type: "follow_up_due",
      title: "📅 Follow-up Due Today",
      message: "Follow-up scheduled for Jane Smith is due today",
      priority: "urgent" as const,
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      actionUrl: "/pages/leads/2",
      actionLabel: "Complete Follow-up",
    },
    {
      notificationId: "3",
      type: "deal_moved",
      title: "📊 Deal Progress",
      message: "Acme Corp deal moved to Negotiation stage",
      priority: "medium" as const,
      isRead: true,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      actionUrl: "/deals/3",
      actionLabel: "View Deal",
    },
  ];

  // Use mock data for now
  const notifications = mockNotifications;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const isLoading = false;

  // Filter notifications by tab
  const filteredNotifications = notifications.filter((notification) => {
    switch (activeTab) {
      case "unread":
        return !notification.isRead;
      case "priority":
        return ["high", "urgent"].includes(notification.priority);
      default:
        return true;
    }
  });

  const handleMarkAsRead = async (notificationId: string) => {
    console.log("Mark as read:", notificationId);
    toast.success("Notification marked as read");
  };

  const handleMarkAllAsRead = async () => {
    console.log("Mark all as read");
    toast.success("All notifications marked as read");
  };

  const handleDeleteNotification = async (notificationId: string) => {
    console.log("Delete notification:", notificationId);
    toast.success("Notification deleted");
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-4 py-2">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="priority" className="text-xs">
                Priority
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <TabsContent value={activeTab} className="mt-0">
            <SafeScrollArea className="h-80">
              <div className="space-y-2 p-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>
                      {activeTab === "unread"
                        ? "No unread notifications"
                        : activeTab === "priority"
                        ? "No priority notifications"
                        : "No notifications"}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.notificationId}
                      notification={notification as any}
                      onMarkRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                    />
                  ))
                )}
              </div>
            </SafeScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2 flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={handleMarkAllAsRead}
              >
                <CheckCircle2 className="h-3 w-3 mr-2" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => setIsOpen(false)}
            >
              View All
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

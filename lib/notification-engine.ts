import {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  deleteExpiredNotifications,
} from "./data/notifications";
import {
  getAutomationRulesByOrganization,
  createAutomationRule,
  updateAutomationRule,
} from "./data/automation-rules";
import { getLeadById } from "./data/leads";
import { getDealById } from "./data/deals";
import type { Notification, AutomationRule } from "./types/database";

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority?: "low" | "medium" | "high" | "urgent";
  channel?: "in_app" | "email" | "slack" | "sms";
  actionUrl?: string;
  actionLabel?: string;
  relatedType?: "lead" | "deal" | "task" | "activity" | "user";
  relatedId?: string;
  organizationId: string;
  expiresAt?: Date;
  metadata?: any;
}

export interface AutomationContext {
  trigger: string;
  relatedType?: string;
  relatedId?: string;
  data: any;
  organizationId: string;
  userId?: string;
}

export class NotificationEngine {
  
  static async sendNotification(data: NotificationData): Promise<any> {
    try {
      const notification = await createNotification({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        priority: data.priority || "medium",
        channel: data.channel || "in_app",
        action_url: data.actionUrl,
        action_label: data.actionLabel,
        related_type: data.relatedType,
        related_id: data.relatedId,
        organization_id: data.organizationId,
        expires_at: data.expiresAt?.toISOString(),
        metadata: data.metadata,
        sent_at: new Date().toISOString(),
        read: false,
      });

      await this.dispatchNotification(notification, data.channel || "in_app");

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  }

  
  static async sendBulkNotifications(
    notifications: NotificationData[]
  ): Promise<void> {
    try {
      const notificationData = notifications.map((n) => ({
        user_id: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        priority: n.priority || "medium",
        channel: n.channel || "in_app",
        action_url: n.actionUrl,
        action_label: n.actionLabel,
        related_type: n.relatedType,
        related_id: n.relatedId,
        organization_id: n.organizationId,
        expires_at: n.expiresAt?.toISOString(),
        metadata: n.metadata,
        sent_at: new Date().toISOString(),
        read: false,
      }));

      const createdNotifications = await createBulkNotifications(notificationData);

      for (const notification of createdNotifications) {
        await this.dispatchNotification(notification, notification.channel);
      }
    } catch (error) {
      console.error("Error sending bulk notifications:", error);
      throw error;
    }
  }

  
  static async processAutomation(context: AutomationContext): Promise<void> {
    try {
      const rules = await getAutomationRulesByOrganization(
        context.organizationId,
        context.trigger,
        true
      );

      for (const rule of rules) {
        try {
          if (await this.evaluateConditions(rule.conditions as any, context)) {
            await this.executeActions(rule.actions as any, context, rule);

            await updateAutomationRule(rule.rule_id, {
              last_triggered: new Date().toISOString(),
              trigger_count: (rule.trigger_count || 0) + 1,
            });
          }
        } catch (error) {
          console.error(
            `Error processing automation rule ${rule.rule_id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("Error processing automation:", error);
    }
  }

  
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    await markNotificationAsRead(notificationId, userId);
  }

  
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: string[];
    } = {}
  ): Promise<{ notifications: any[]; unreadCount: number }> {
    const notifications = await getUserNotifications(userId, options);
    const unreadCount = await getUnreadNotificationCount(userId);

    return { notifications, unreadCount };
  }

  
  static async cleanupExpiredNotifications(): Promise<void> {
    await deleteExpiredNotifications();
  }

  
  static async sendSystemNotification(
    organizationId: string,
    notification: Omit<NotificationData, "userId" | "organizationId">
  ): Promise<void> {
    const { getOrganizationUsers } = await import("./data/user-organizations");
    
    // Get all users in organization
    const userOrgs = await getOrganizationUsers(organizationId);
    const userIds = userOrgs.map((uo) => uo.user_id);

    const notifications = userIds.map((userId) => ({
      ...notification,
      userId,
      organizationId,
    }));

    await this.sendBulkNotifications(notifications);
  }

  
  static async createDefaultAutomationRules(
    organizationId: string,
    createdBy: string
  ): Promise<void> {
    const defaultRules = [
      {
        name: "High Score Lead Alert",
        description: "Notify when a lead scores 60 or higher",
        trigger: "lead_score_changed",
        conditions: {
          score: { gte: 60 },
        },
        actions: [
          {
            type: "notification",
            target: "assigned_user",
            template: "high_score_lead",
            priority: "high",
          },
        ],
      },
      {
        name: "Stale Lead Reminder",
        description: "Notify when a lead hasn't been contacted in 7 days",
        trigger: "lead_stale",
        conditions: {
          daysSinceLastActivity: { gte: 7 },
          status: { neq: "qualified" },
        },
        actions: [
          {
            type: "notification",
            target: "assigned_user",
            template: "stale_lead_reminder",
            priority: "medium",
          },
        ],
      },
      {
        name: "Deal Stuck Alert",
        description: "Alert when deal stays in same stage for 14+ days",
        trigger: "deal_stuck",
        conditions: {
          daysInStage: { gte: 14 },
          stage: { nin: ["closed_won", "closed_lost"] },
        },
        actions: [
          {
            type: "notification",
            target: "assigned_user",
            template: "deal_stuck_alert",
            priority: "high",
          },
          {
            type: "notification",
            target: "manager",
            template: "deal_stuck_manager",
            priority: "medium",
          },
        ],
      },
      {
        name: "Follow-up Due Reminder",
        description: "Daily reminder for due follow-ups",
        trigger: "follow_up_due",
        conditions: {
          dueDate: { eq: "today" },
        },
        actions: [
          {
            type: "notification",
            target: "assigned_user",
            template: "follow_up_due",
            priority: "high",
          },
        ],
      },
    ];

    for (const [index, rule] of defaultRules.entries()) {
      await createAutomationRule({
        organization_id: organizationId,
        trigger: rule.trigger,
        conditions: rule.conditions,
        actions: rule.actions,
        is_active: true,
        priority: index + 1,
        trigger_count: 0,
        created_by: createdBy,
      });
    }
  }

  
  private static async evaluateConditions(
    conditions: any,
    context: AutomationContext
  ): Promise<boolean> {
    try {
     
      const data = context.data;

      for (const [key, condition] of Object.entries(conditions)) {
        const value = data[key];

        if (typeof condition === "object" && condition !== null) {
          const operators = condition as any;

          for (const [op, expected] of Object.entries(operators)) {
            switch (op) {
              case "eq":
                if (value !== expected) return false;
                break;
              case "neq":
                if (value === expected) return false;
                break;
              case "gt":
                if (!(value > expected)) return false;
                break;
              case "gte":
                if (!(value >= expected)) return false;
                break;
              case "lt":
                if (!(value < expected)) return false;
                break;
              case "lte":
                if (!(value <= expected)) return false;
                break;
              case "in":
                if (!Array.isArray(expected) || !expected.includes(value))
                  return false;
                break;
              case "nin":
                if (Array.isArray(expected) && expected.includes(value))
                  return false;
                break;
              default:
                console.warn(`Unknown operator: ${op}`);
            }
          }
        } else {
         
          if (value !== condition) return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error evaluating conditions:", error);
      return false;
    }
  }

  
  private static async executeActions(
    actions: any[],
    context: AutomationContext,
    rule: any
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case "notification":
            await this.executeNotificationAction(action, context);
            break;
          case "email":
            await this.executeEmailAction(action, context);
            break;
          case "task":
            await this.executeTaskAction(action, context);
            break;
          case "webhook":
            await this.executeWebhookAction(action, context);
            break;
          default:
            console.warn(`Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
      }
    }
  }

  
  private static async executeNotificationAction(
    action: any,
    context: AutomationContext
  ): Promise<void> {
    const template = this.getNotificationTemplate(action.template, context);

    let targetUserId = context.userId;

   
    if (
      action.target === "assigned_user" &&
      context.relatedType &&
      context.relatedId
    ) {
      targetUserId = await this.getAssignedUser(
        context.relatedType,
        context.relatedId
      );
    }

    if (targetUserId) {
      await this.sendNotification({
        userId: targetUserId,
        organizationId: context.organizationId,
        type: action.template,
        title: template.title,
        message: template.message,
        priority: action.priority || "medium",
        actionUrl: template.actionUrl,
        actionLabel: template.actionLabel,
        relatedType: context.relatedType,
        relatedId: context.relatedId,
      });
    }
  }

  
  private static async executeEmailAction(
    action: any,
    context: AutomationContext
  ): Promise<void> {
   
    console.log("Executing email action:", action);
  }

  
  private static async executeTaskAction(
    action: any,
    context: AutomationContext
  ): Promise<void> {
   
    console.log("Executing task action:", action);
  }

  
  private static async executeWebhookAction(
    action: any,
    context: AutomationContext
  ): Promise<void> {
   
    console.log("Executing webhook action:", action);
  }

  
  private static getNotificationTemplate(
    templateName: string,
    context: AutomationContext
  ): any {
    const templates = {
      high_score_lead: {
        title: "🔥 High-Value Lead Alert",
        message: `Lead ${context.data.name} scored ${context.data.score} points - high conversion potential!`,
        actionUrl: `/pages/leads/${context.relatedId}`,
        actionLabel: "View Lead",
      },
      stale_lead_reminder: {
        title: "⏰ Lead Needs Attention",
        message: `Lead ${context.data.name} hasn't been contacted in ${context.data.daysSinceLastActivity} days`,
        actionUrl: `/pages/leads/${context.relatedId}`,
        actionLabel: "Contact Lead",
      },
      deal_stuck_alert: {
        title: "🚨 Deal Stuck in Pipeline",
        message: `Deal "${context.data.title}" has been in ${context.data.stage} for ${context.data.daysInStage} days`,
        actionUrl: `/deals/${context.relatedId}`,
        actionLabel: "Review Deal",
      },
      follow_up_due: {
        title: "📅 Follow-up Due Today",
        message: `Follow-up scheduled for ${context.data.leadName} is due today`,
        actionUrl: `/pages/leads/${context.relatedId}`,
        actionLabel: "Complete Follow-up",
      },
    };

    return (
      templates[templateName as keyof typeof templates] || {
        title: "Notification",
        message: "You have a new notification",
        actionUrl: "/",
        actionLabel: "View",
      }
    );
  }

  
  private static async getAssignedUser(
    entityType: string,
    entityId: string
  ): Promise<string | null> {
    try {
      switch (entityType) {
        case "lead":
          const lead = await getLeadById(entityId);
          return lead?.assigned_to || lead?.created_by || null;
        case "deal":
          const deal = await getDealById(entityId);
          return deal?.user_id || null;
        default:
          return null;
      }
    } catch (error) {
      console.error("Error getting assigned user:", error);
      return null;
    }
  }

  
  private static async dispatchNotification(
    notification: any,
    channel: string
  ): Promise<void> {
    switch (channel) {
      case "in_app":
       
        break;
      case "email":
       
        console.log("Sending email notification:", notification.title);
        break;
      case "slack":
       
        console.log("Sending Slack notification:", notification.title);
        break;
      case "sms":
       
        console.log("Sending SMS notification:", notification.title);
        break;
    }
  }
}

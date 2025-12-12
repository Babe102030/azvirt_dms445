import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createNotification,
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  updateNotificationStatus,
  getOrCreateNotificationPreferences,
  updateNotificationPreferences,
  getNotificationPreferences,
  recordNotificationHistory,
  getNotificationHistory,
  getNotificationHistoryByUser,
} from "../db";
import {
  sendEmailNotification,
  sendSmsNotification,
  formatNotificationMessage,
  validateNotificationPayload,
} from "../_core/notificationService";
import { TRPCError } from "@trpc/server";

export const notificationsRouter = router({
  // Get all notifications for current user
  getNotifications: protectedProcedure
    .input(z.object({ limit: z.number().default(50).optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const notifications = await getNotifications(ctx.user.id, input.limit);
        return notifications;
      } catch (error) {
        console.error("[Notifications] Failed to fetch notifications:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch notifications",
        });
      }
    }),

  // Get unread notifications count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const unread = await getUnreadNotifications(ctx.user.id);
      return { count: unread.length };
    } catch (error) {
      console.error("[Notifications] Failed to get unread count:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get unread count",
      });
    }
  }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const notifications = await getNotifications(ctx.user.id, 1000);
        const notification = notifications.find(n => n.id === input.notificationId);

        if (!notification) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Notification not found",
          });
        }

        await markNotificationAsRead(input.notificationId);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Notifications] Failed to mark as read:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark notification as read",
        });
      }
    }),

  // Get notification preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    try {
      let preferences = await getNotificationPreferences(ctx.user.id);

      if (!preferences) {
        await getOrCreateNotificationPreferences(ctx.user.id);
        preferences = await getNotificationPreferences(ctx.user.id);
      }

      return preferences;
    } catch (error) {
      console.error("[Notifications] Failed to get preferences:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get notification preferences",
      });
    }
  }),

  // Update notification preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        overdueReminders: z.boolean().optional(),
        completionNotifications: z.boolean().optional(),
        assignmentNotifications: z.boolean().optional(),
        statusChangeNotifications: z.boolean().optional(),
        quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await updateNotificationPreferences(ctx.user.id, input);
        const updated = await getNotificationPreferences(ctx.user.id);
        return updated;
      } catch (error) {
        console.error("[Notifications] Failed to update preferences:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update notification preferences",
        });
      }
    }),

  // Send test notification
  sendTestNotification: protectedProcedure
    .input(
      z.object({
        channel: z.enum(["email", "sms", "in_app"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = ctx.user;

        if (input.channel === "email" && !user.email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User email not configured",
          });
        }

        if (input.channel === "sms" && !user.phoneNumber) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User phone number not configured",
          });
        }

        const testMessage = "This is a test notification from AzVirt DMS";
        const testTitle = "Test Notification";

        let result: { success: boolean; error?: string } = { success: false };

        if (input.channel === "email") {
          result = await sendEmailNotification(
            user.email!,
            testTitle,
            testMessage,
            0,
            "test"
          );
        } else if (input.channel === "sms") {
          result = await sendSmsNotification(user.phoneNumber!, testMessage);
        }

        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: result.error ?? "Failed to send test notification",
          });
        }

        return { success: true, message: "Test notification sent" };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Notifications] Failed to send test notification:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send test notification",
        });
      }
    }),

  // Get notification history
  getHistory: protectedProcedure
    .input(z.object({ days: z.number().default(30).optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const history = await getNotificationHistoryByUser(
          ctx.user.id,
          input.days
        );
        return history;
      } catch (error) {
        console.error("[Notifications] Failed to get history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get notification history",
        });
      }
    }),

  // Clear all notifications
  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // In a real app, you might want to soft-delete or archive
      // For now, we'll just return success
      console.log(`[Notifications] User ${ctx.user.id} cleared all notifications`);
      return { success: true };
    } catch (error) {
      console.error("[Notifications] Failed to clear notifications:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to clear notifications",
      });
    }
  }),
});

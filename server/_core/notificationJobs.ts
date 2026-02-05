import {
  sendEmailNotification,
  sendSmsNotification,
  formatNotificationMessage,
  isWithinQuietHours,
} from "./notificationService";
import {
  createNotification,
  getNotificationPreferences,
  recordNotificationHistory,
  getOverdueTasks,
  getUserById,
  getUserByOpenId,
} from "../db";

/**
 * Check for overdue tasks and send notifications
 */
export async function checkAndNotifyOverdueTasks() {
  try {
    console.log("[NotificationJobs] Starting overdue task check...");

    // Get all overdue tasks that are not completed
    const overdueTasks = await getOverdueTasks(100);

    console.log(
      `[NotificationJobs] Found ${overdueTasks.length} overdue tasks`,
    );

    for (const task of overdueTasks) {
      try {
        // Get user details
        const user = await getUserById(task.createdBy);

        if (!user) continue;

        const prefs = await getNotificationPreferences(task.createdBy);

        // Check if user wants overdue reminders
        if (!(prefs as any)?.overdueReminders) {
          console.log(
            `[NotificationJobs] User ${task.createdBy} has overdue reminders disabled`,
          );
          continue;
        }

        // Check quiet hours
        if (
          isWithinQuietHours(
            (prefs as any)?.quietHoursStart ?? undefined,
            (prefs as any)?.quietHoursEnd ?? undefined,
          )
        ) {
          console.log(
            `[NotificationJobs] User ${task.createdBy} is in quiet hours, skipping notification`,
          );
          continue;
        }

        // Create notification record
        const message = formatNotificationMessage(
          "overdue_reminder",
          task.title,
          {
            daysOverdue: task.dueDate
              ? Math.floor(
                  (Date.now() - new Date(task.dueDate).getTime()) /
                    (1000 * 60 * 60 * 24),
                ).toString()
              : "0",
          },
        );

        const channels: ("email" | "sms" | "in_app")[] = [];
        if ((prefs as any)?.emailEnabled) channels.push("email");
        if ((prefs as any)?.smsEnabled) channels.push("sms");
        if ((prefs as any)?.inAppEnabled) channels.push("in_app");

        const notificationResult = await createNotification({
          userId: task.createdBy,
          type: "overdue_reminder",
          title: `Task Overdue: ${task.title}`,
          message,
          status: "pending",
        } as any);

        // Neo4j createNotification returns just the ID usually, or we adjusted it.
        // Let's check db.ts return type. It returns insertId (number).
        const notificationId = notificationResult;

        // Send email if enabled
        if ((prefs as any)?.emailEnabled && user.email) {
          const emailResult = await sendEmailNotification(
            user.email,
            `Task Overdue: ${task.title}`,
            message,
            task.id,
            "overdue_reminder",
          );

          await recordNotificationHistory({
            notificationId,
            userId: task.createdBy,
            channel: "email",
            status: emailResult.success ? "sent" : "failed",
            recipient: user.email,
            errorMessage: emailResult.error,
          });

          console.log(
            `[NotificationJobs] Email notification sent to ${user.email} for task ${task.id}`,
          );
        }

        // Send SMS if enabled
        if ((prefs as any)?.smsEnabled && user.phoneNumber) {
          const smsResult = await sendSmsNotification(
            user.phoneNumber,
            `Task Overdue: ${task.title} - ${message}`,
          );

          await recordNotificationHistory({
            notificationId,
            userId: task.createdBy,
            channel: "sms",
            status: smsResult.success ? "sent" : "failed",
            recipient: user.phoneNumber,
            errorMessage: smsResult.error,
          });

          console.log(
            `[NotificationJobs] SMS notification sent to ${user.phoneNumber} for task ${task.id}`,
          );
        }

        // In-app notification is always recorded
        if ((prefs as any)?.inAppEnabled) {
          await recordNotificationHistory({
            notificationId,
            userId: task.createdBy,
            channel: "in_app",
            status: "sent",
            recipient: `user_${task.createdBy}`,
          });
        }
      } catch (error) {
        console.error(
          `[NotificationJobs] Error processing task ${task.id}:`,
          error,
        );
      }
    }

    console.log("[NotificationJobs] Overdue task check completed");
  } catch (error) {
    console.error(
      "[NotificationJobs] Fatal error in checkAndNotifyOverdueTasks:",
      error,
    );
  }
}

/**
 * Send completion confirmation notifications
 */
export async function notifyTaskCompletion(
  taskId: number,
  taskTitle: string,
  userId: number,
  completedBy: number,
) {
  try {
    console.log(
      `[NotificationJobs] Sending completion notification for task ${taskId}`,
    );

    // Get user details
    const user = await getUserById(userId);

    if (!user) return;

    const prefs = await getNotificationPreferences(userId);

    // Check if user wants completion notifications
    if (!(prefs as any)?.completionNotifications) {
      console.log(
        `[NotificationJobs] User ${userId} has completion notifications disabled`,
      );
      return;
    }

    // Check quiet hours
    if (
      isWithinQuietHours(
        (prefs as any)?.quietHoursStart ?? undefined,
        (prefs as any)?.quietHoursEnd ?? undefined,
      )
    ) {
      console.log(
        `[NotificationJobs] User ${userId} is in quiet hours, skipping notification`,
      );
      return;
    }

    const message = formatNotificationMessage(
      "completion_confirmation",
      taskTitle,
    );

    const channels: ("email" | "sms" | "in_app")[] = [];
    if ((prefs as any)?.emailEnabled) channels.push("email");
    if ((prefs as any)?.inAppEnabled) channels.push("in_app");

    const notificationResult = await createNotification({
      userId,
      type: "completion_confirmation",
      title: `Task Completed: ${taskTitle}`,
      message,
      status: "pending",
    } as any);

    const notificationId = notificationResult;

    // Send email if enabled
    if ((prefs as any)?.emailEnabled && user.email) {
      const emailResult = await sendEmailNotification(
        user.email,
        `Task Completed: ${taskTitle}`,
        message,
        taskId,
        "completion_confirmation",
      );

      await recordNotificationHistory({
        notificationId,
        userId,
        channel: "email",
        status: emailResult.success ? "sent" : "failed",
        recipient: user.email,
        errorMessage: emailResult.error,
      });

      console.log(
        `[NotificationJobs] Completion email sent to ${user.email} for task ${taskId}`,
      );
    }

    // In-app notification
    if ((prefs as any)?.inAppEnabled) {
      await recordNotificationHistory({
        notificationId,
        userId,
        channel: "in_app",
        status: "sent",
        recipient: `user_${userId}`,
      });
    }
  } catch (error) {
    console.error(
      `[NotificationJobs] Error sending completion notification for task ${taskId}:`,
      error,
    );
  }
}

/**
 * Schedule the overdue task check to run daily at 9 AM
 */
export function scheduleOverdueTaskCheck() {
  // Calculate time until 9 AM
  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setHours(9, 0, 0, 0);

  // If it's already past 9 AM today, schedule for tomorrow
  if (now.getTime() > scheduledTime.getTime()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delayMs = scheduledTime.getTime() - now.getTime();

  console.log(
    `[NotificationJobs] Scheduling overdue task check in ${Math.round(delayMs / 1000 / 60)} minutes`,
  );

  // Initial timeout
  setTimeout(() => {
    checkAndNotifyOverdueTasks();

    // Then run every 24 hours
    setInterval(
      () => {
        checkAndNotifyOverdueTasks();
      },
      24 * 60 * 60 * 1000,
    );
  }, delayMs);
}

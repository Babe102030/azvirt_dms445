import { db } from "../db";
import * as schema from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { sendEmailNotification } from "./notificationService";
import { sendSMS } from "./sms";
import { createNotification } from "../db";

/**
 * Daily job to check all material stock levels against their minimum thresholds.
 * Sends alerts to admins if levels are low or critical.
 */
export async function checkDailyStockLevels() {
  try {
    console.log("[StockJobs] Starting daily stock level check...");

    // 1. Get all materials
    const materials = await db.select().from(schema.materials);

    const lowStockMaterials = materials.filter(
      (m) => m.quantity <= (m.minStock || 0),
    );
    const criticalMaterials = materials.filter(
      (m) => m.quantity <= (m.criticalThreshold || 0),
    );

    if (lowStockMaterials.length === 0) {
      console.log("[StockJobs] All stock levels are healthy.");
      return;
    }

    // 2. Identify Admin users to notify
    const adminUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "admin"));

    if (adminUsers.length === 0) {
      console.log("[StockJobs] No admin users found to notify.");
      return;
    }

    // 3. Prepare message content
    const lowStockList = lowStockMaterials
      .map((m) => `- ${m.name}: ${m.quantity} ${m.unit} (Min: ${m.minStock})`)
      .join("\n");

    const criticalList =
      criticalMaterials.length > 0
        ? "\nCRITICAL LEVELS:\n" +
          criticalMaterials
            .map(
              (m) =>
                `- ${m.name}: ${m.quantity} ${m.unit} (Critical: ${m.criticalThreshold})`,
            )
            .join("\n")
        : "";

    const emailSubject = `Low Stock Alert - ${new Date().toLocaleDateString()}`;
    const emailBody = `Daily Stock Report:\n\nThe following materials are below their minimum stock thresholds:\n\n${lowStockList}${criticalList}\n\nPlease review and reorder as necessary.`;

    // 4. Send notifications
    for (const admin of adminUsers) {
      // In-app notification
      await createNotification({
        userId: admin.id,
        type: "low_stock",
        title: "Daily Low Stock Report",
        message: `There are ${lowStockMaterials.length} materials below minimum stock levels.`,
        status: "unread",
      } as any);

      // Email notification
      if (admin.email) {
        await sendEmailNotification(
          admin.email,
          emailSubject,
          emailBody,
          undefined,
          "low_stock",
        );
      }

      // SMS for critical materials
      if (
        admin.smsNotificationsEnabled &&
        admin.phoneNumber &&
        criticalMaterials.length > 0
      ) {
        const smsMessage = `ALERT: ${criticalMaterials.length} materials have reached CRITICAL stock levels. Check AzVirt DMS dashboard for details.`;
        await sendSMS({ phoneNumber: admin.phoneNumber, message: smsMessage });
      }
    }

    console.log(
      `[StockJobs] Stock check completed. Notified ${adminUsers.length} admins about ${lowStockMaterials.length} items.`,
    );
  } catch (error) {
    console.error("[StockJobs] Error in daily stock check:", error);
  }
}

/**
 * Schedule the stock check to run daily at a specific time (e.g., 7 AM)
 */
export function scheduleStockCheck() {
  const CHECK_HOUR = 7; // 7 AM

  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setHours(CHECK_HOUR, 0, 0, 0);

  if (now.getTime() > scheduledTime.getTime()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  const delayMs = scheduledTime.getTime() - now.getTime();

  console.log(
    `[StockJobs] Scheduling daily stock check in ${Math.round(delayMs / 1000 / 60)} minutes`,
  );

  setTimeout(() => {
    checkDailyStockLevels();
    // Repeat every 24 hours
    setInterval(checkDailyStockLevels, 24 * 60 * 60 * 1000);
  }, delayMs);
}

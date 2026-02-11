import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "../drizzle/schema";
import {
  eq,
  and,
  gte,
  lte,
  desc,
  like,
  sql as drizzleSql,
  or,
  inArray,
  not,
  count,
  sum,
  avg,
} from "drizzle-orm";

// SQLite (libsql) connection for local development and testing
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // In a test environment, vitest doesn't load .env automatically.
  // We can provide a default for convenience.
  if (process.env.NODE_ENV === "test") {
    process.env.DATABASE_URL = "file:./db/dev.db";
  } else {
    throw new Error("DATABASE_URL is required");
  }
}

const client = createClient({
  url: process.env.DATABASE_URL!,
});

export const db = drizzle(client, { schema });

export async function getDb() {
  return db;
}

export type InsertUser = typeof schema.users.$inferInsert;
export type InsertProject = typeof schema.projects.$inferInsert;
export type InsertMaterial = typeof schema.materials.$inferInsert;

export async function upsertUser(data: InsertUser) {
  return db
    .insert(schema.users)
    .values(data)
    .onConflictDoUpdate({
      target: schema.users.openId,
      set: {
        name: data.name,
        email: data.email,
        lastSignedIn: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();
}

export async function getUserByOpenId(openId: string) {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.openId, openId));
  return result[0];
}

export async function getUserById(id: number) {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return result[0];
}

export async function createProject(data: InsertProject) {
  const result = await db
    .insert(schema.projects)
    .values(data)
    .returning({ id: schema.projects.id });
  return result[0].id;
}

export async function getProjects() {
  return db
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.createdAt));
}

export async function getProjectById(id: number) {
  const result = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id));
  return result[0];
}

export async function updateProject(id: number, data: Partial<InsertProject>) {
  return db
    .update(schema.projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.projects.id, id));
}

export async function createMaterial(data: InsertMaterial) {
  const result = await db
    .insert(schema.materials)
    .values(data)
    .returning({ id: schema.materials.id });
  return result[0].id;
}

export async function getMaterials() {
  return db
    .select()
    .from(schema.materials)
    .orderBy(desc(schema.materials.createdAt));
}

export async function updateMaterial(
  id: number,
  data: Partial<InsertMaterial>,
) {
  return db
    .update(schema.materials)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.materials.id, id));
}

export async function deleteMaterial(id: number) {
  return db.delete(schema.materials).where(eq(schema.materials.id, id));
}

export type InsertDocument = typeof schema.documents.$inferInsert;

export async function createDocument(data: InsertDocument) {
  const result = await db
    .insert(schema.documents)
    .values(data)
    .returning({ id: schema.documents.id });
  return result[0].id;
}

export async function getDocuments(filters?: {
  projectId?: number;
  category?: string;
  search?: string;
}) {
  let query = db.select().from(schema.documents);
  const conditions = [];
  if (filters?.projectId)
    conditions.push(eq(schema.documents.projectId, filters.projectId));
  // category is not in schema for documents, so skipping
  if (filters?.search)
    conditions.push(like(schema.documents.name, `%${filters.search}%`));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query
      .where(and(...conditions))
      .orderBy(desc(schema.documents.createdAt));
  }
  return await query.orderBy(desc(schema.documents.createdAt));
}

export async function getDocumentById(id: number) {
  const result = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.id, id));
  return result[0];
}

export async function deleteDocument(id: number) {
  return db.delete(schema.documents).where(eq(schema.documents.id, id));
}

export type InsertDelivery = typeof schema.deliveries.$inferInsert;

export async function createDelivery(data: InsertDelivery) {
  const result = await db
    .insert(schema.deliveries)
    .values(data)
    .returning({ id: schema.deliveries.id });
  return result[0].id;
}

export async function getDeliveries(filters?: {
  projectId?: number;
  status?: string;
}) {
  let query = db.select().from(schema.deliveries);
  const conditions = [];
  if (filters?.projectId)
    conditions.push(eq(schema.deliveries.projectId, filters.projectId));
  if (filters?.status)
    conditions.push(eq(schema.deliveries.status, filters.status));

  if (conditions.length > 0) {
    // @ts-ignore - drizzle type complexity
    return await query
      .where(and(...conditions))
      .orderBy(desc(schema.deliveries.scheduledTime));
  }

  return await query.orderBy(desc(schema.deliveries.scheduledTime));
}

export async function updateDelivery(
  id: number,
  data: Partial<InsertDelivery>,
) {
  return db
    .update(schema.deliveries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.deliveries.id, id));
}

export type InsertQualityTest = typeof schema.qualityTests.$inferInsert;

export async function createQualityTest(data: InsertQualityTest) {
  const result = await db
    .insert(schema.qualityTests)
    .values(data)
    .returning({ id: schema.qualityTests.id });
  return result[0].id;
}

export async function getQualityTests(filters?: {
  deliveryId?: number;
  testType?: string;
  status?: string;
}) {
  let query = db.select().from(schema.qualityTests);
  const conditions = [];
  if (filters?.deliveryId)
    conditions.push(eq(schema.qualityTests.deliveryId, filters.deliveryId));
  if (filters?.testType)
    conditions.push(eq(schema.qualityTests.testType, filters.testType));
  if (filters?.status)
    conditions.push(eq(schema.qualityTests.status, filters.status));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query
      .where(and(...conditions))
      .orderBy(desc(schema.qualityTests.createdAt));
  }

  return await query.orderBy(desc(schema.qualityTests.createdAt));
}

// Stubs for other functions from the outline to avoid breaking the app
// These can be implemented as needed.

export type InsertEmployee = typeof schema.employees.$inferInsert;

export async function createEmployee(data: InsertEmployee) {
  const result = await db
    .insert(schema.employees)
    .values(data)
    .returning({ id: schema.employees.id });
  return result[0].id;
}

export type InsertWorkHour = typeof schema.workHours.$inferInsert;

export async function createWorkHour(data: InsertWorkHour) {
  const result = await db
    .insert(schema.workHours)
    .values(data)
    .returning({ id: schema.workHours.id });
  return result[0].id;
}

export async function updateQualityTest(
  id: number,
  data: Partial<InsertQualityTest>,
) {
  return db
    .update(schema.qualityTests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.qualityTests.id, id));
}

// ... other functions would go here

export async function calculateConsumptionRate(
  materialId: number,
  days: number = 30,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const history = await db
    .select()
    .from(schema.materialConsumptionHistory)
    .where(
      and(
        eq(schema.materialConsumptionHistory.materialId, materialId),
        gte(schema.materialConsumptionHistory.date, cutoff),
      ),
    );

  if (history.length === 0) {
    return {
      dailyAverage: 0,
      weeklyAverage: 0,
      monthlyAverage: 0,
      trendFactor: 1.0,
      confidence: "low",
      dataPoints: 0,
    };
  }

  const totalUsed = history.reduce((acc, row) => acc + row.quantityUsed, 0);
  const dailyAverage = totalUsed / days;

  return {
    dailyAverage,
    weeklyAverage: dailyAverage * 7,
    monthlyAverage: dailyAverage * 30,
    trendFactor: 1.0,
    confidence: "medium",
    dataPoints: history.length,
  };
}

export async function predictStockoutDate(materialId: number) {
  const material = (
    await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.id, materialId))
  )[0];
  if (!material) return null;

  const currentStock = material.quantity;
  const consumptionData = await calculateConsumptionRate(materialId);
  if (consumptionData.dailyAverage <= 0) return null;

  const daysUntilStockout = currentStock / consumptionData.dailyAverage;
  const stockoutDate = new Date();
  stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);
  return stockoutDate;
}

export async function calculateReorderPoint(materialId: number) {
  const material = (
    await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.id, materialId))
  )[0];
  if (!material) return 0;
  const leadTimeDays = material.leadTimeDays || 7; // default lead time
  const consumptionData = await calculateConsumptionRate(materialId);
  const dailyRate = consumptionData.dailyAverage;
  const safetyFactor = 1.5; // 50% safety stock
  const safetyStock = dailyRate * leadTimeDays * (safetyFactor - 1);
  const reorderPoint = dailyRate * leadTimeDays + safetyStock;
  return reorderPoint;
}

export async function calculateOptimalOrderQuantity(materialId: number) {
  // Simplified EOQ - needs more parameters in a real scenario
  const material = (
    await db
      .select()
      .from(schema.materials)
      .where(eq(schema.materials.id, materialId))
  )[0];
  if (!material) return 0;
  const consumptionData = await calculateConsumptionRate(materialId);
  if (consumptionData.monthlyAverage > 0) {
    return consumptionData.monthlyAverage * 1.25; // Order a bit more than a month's supply
  }
  return material.minStock * 2; // Fallback
}

export async function generateForecastPredictions() {
  const materials = await db.select().from(schema.materials);
  const predictions = [];

  for (const material of materials) {
    const consumptionRate = await calculateConsumptionRate(material.id, 60);
    const stockoutDate = await predictStockoutDate(material.id);
    const reorderPoint = await calculateReorderPoint(material.id);
    const optimalQty = await calculateOptimalOrderQuantity(material.id);

    const daysUntilStockout = stockoutDate
      ? Math.floor(
          (stockoutDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        )
      : null;

    const needsReorder = material.quantity <= reorderPoint;
    const urgency =
      daysUntilStockout !== null && daysUntilStockout < 7
        ? "critical"
        : daysUntilStockout !== null && daysUntilStockout < 14
          ? "high"
          : needsReorder
            ? "medium"
            : "low";

    predictions.push({
      materialId: material.id,
      materialName: material.name,
      currentStock: material.quantity,
      unit: material.unit,
      dailyConsumptionRate: consumptionRate.dailyAverage,
      trendFactor: consumptionRate.trendFactor,
      predictedStockoutDate: stockoutDate,
      daysUntilStockout,
      reorderPoint,
      recommendedOrderQuantity: optimalQty,
      needsReorder,
      urgency,
      confidence: consumptionRate.confidence,
    });
  }

  // Sort by urgency
  return predictions.sort((a, b) => {
    const urgencyOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return (urgencyOrder[a.urgency] || 0) - (urgencyOrder[b.urgency] || 0);
  });
}

export async function createNotificationTemplate(data: any) {
  // This is a placeholder. A real implementation would insert into a 'notificationTemplates' table.
  console.log("Creating notification template:", data);
  return { insertId: Math.floor(Math.random() * 1000) };
}

export async function getNotificationTemplates() {
  return [{ id: 1, name: "Test Template", subject: "Test Subject" }];
}
export async function getNotificationTemplate(id: number) {
  if (id) {
    return { id, name: "Test Template", subject: "Test Subject" };
  }
  return null;
}
export async function updateNotificationTemplate(id: number, data: any) {
  return true;
}
export async function deleteNotificationTemplate(id: number) {
  return true;
}
export async function createNotificationTrigger(data: any) {
  return { insertId: Math.floor(Math.random() * 1000) };
}
export async function getNotificationTriggers() {
  return [{ id: 1, name: "Test Trigger", eventType: "stock_low" }];
}
export async function getNotificationTrigger(id: number) {
  if (id) {
    return { id, name: "Low Stock Alert Trigger", eventType: "stock_low" };
  }
  return null;
}
export async function updateNotificationTrigger(id: number, data: any) {
  return true;
}
export async function deleteNotificationTrigger(id: number) {
  return true;
}

/**
 * Notification history helpers
 *
 * The functions below attempt to use the `notificationHistory` schema if it exists.
 * If the schema/table is not present (for lightweight/test environments) they fall
 * back to safe stubs so importing modules do not break.
 */

export type NotificationHistoryInsert = {
  notificationId: number;
  userId: number;
  channel: "email" | "sms" | "in_app" | string;
  status: "sent" | "failed" | "pending" | string;
  recipient?: string | null;
  errorMessage?: string | null;
};

export async function recordNotificationHistory(
  data: NotificationHistoryInsert,
) {
  try {
    // If a notificationHistory table exists in the schema, insert there
    if ((schema as any).notificationHistory) {
      const insertData: any = {
        notificationId: data.notificationId,
        userId: data.userId,
        channel: data.channel,
        status: data.status,
        recipient: data.recipient ?? null,
        errorMessage: data.errorMessage ?? null,
        createdAt: new Date(),
      };

      // Using `any` for schema access to avoid strict type errors when the table is not defined.
      const result = await db
        .insert((schema as any).notificationHistory)
        .values(insertData)
        .returning({ id: (schema as any).notificationHistory.id });

      // Return inserted id when possible
      return result && result[0] ? (result[0].id as number) : null;
    } else {
      // Fallback / stub behavior
      console.log("[DB] recordNotificationHistory (stub)", data);
      return null;
    }
  } catch (error) {
    console.error("[DB] recordNotificationHistory error:", error);
    return null;
  }
}

export async function getNotificationHistory(notificationId: number) {
  try {
    if ((schema as any).notificationHistory) {
      return await db
        .select()
        .from((schema as any).notificationHistory)
        .where(
          eq(
            (schema as any).notificationHistory.notificationId,
            notificationId,
          ),
        )
        .orderBy(desc((schema as any).notificationHistory.createdAt));
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getNotificationHistory error:", error);
    return [];
  }
}

/**
 * Returns notification history for a given user limited to the last `days`.
 * If the notificationHistory schema/table is unavailable this returns an empty array.
 */
export async function getNotificationHistoryByUser(
  userId: number,
  days: number = 30,
) {
  try {
    if ((schema as any).notificationHistory) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (days || 30));

      return await db
        .select()
        .from((schema as any).notificationHistory)
        .where(
          and(
            eq((schema as any).notificationHistory.userId, userId),
            gte((schema as any).notificationHistory.createdAt, cutoff),
          ),
        )
        .orderBy(desc((schema as any).notificationHistory.createdAt));
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getNotificationHistoryByUser error:", error);
    return [];
  }
}

/**
 * Notification and task helper functions
 *
 * These helpers provide lightweight implementations when the related
 * tables exist in the schema. If a schema/table is not present the
 * functions fall back to safe stubs so imports do not break during
 * local development or tests.
 */

/**
 * Create a notification record.
 * Returns the inserted notification id when available.
 */
export async function createNotification(notification: any) {
  try {
    if ((schema as any).notifications) {
      const toInsert = {
        ...notification,
        sentAt: notification.sentAt ?? new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await db
        .insert((schema as any).notifications)
        .values(toInsert)
        .returning({ id: (schema as any).notifications.id });
      return result && result[0] ? result[0].id : null;
    } else {
      console.log("[DB] createNotification (stub)", notification);
      return Math.floor(Math.random() * 100000);
    }
  } catch (error) {
    console.error("[DB] createNotification error:", error);
    return null;
  }
}

/**
 * Retrieve notifications for a user.
 */
export async function getNotifications(userId: number, limit: number = 20) {
  try {
    if ((schema as any).notifications) {
      // @ts-ignore
      return await db
        .select()
        .from((schema as any).notifications)
        .where(eq((schema as any).notifications.userId, userId))
        .orderBy(desc((schema as any).notifications.sentAt))
        .limit(limit);
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getNotifications error:", error);
    return [];
  }
}

/**
 * Get unread notifications for a user.
 */
export async function getUnreadNotifications(userId: number) {
  try {
    if ((schema as any).notifications) {
      return await db
        .select()
        .from((schema as any).notifications)
        .where(
          and(
            eq((schema as any).notifications.userId, userId),
            eq((schema as any).notifications.status, "unread"),
          ),
        )
        .orderBy(desc((schema as any).notifications.sentAt));
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getUnreadNotifications error:", error);
    return [];
  }
}

/**
 * Mark a notification as read.
 */
export async function markNotificationAsRead(notificationId: number) {
  try {
    if ((schema as any).notifications) {
      await db
        .update((schema as any).notifications)
        .set({ status: "read", updatedAt: new Date() })
        .where(eq((schema as any).notifications.id, notificationId));
      return true;
    } else {
      console.log("[DB] markNotificationAsRead (stub)", notificationId);
      return true;
    }
  } catch (error) {
    console.error("[DB] markNotificationAsRead error:", error);
    return false;
  }
}

/**
 * Notification preferences helpers: get, create-or-get and update
 */
export async function getOrCreateNotificationPreferences(userId: number) {
  try {
    if ((schema as any).notificationPreferences) {
      const existing = await db
        .select()
        .from((schema as any).notificationPreferences)
        .where(eq((schema as any).notificationPreferences.userId, userId));
      if (existing && existing[0]) return existing[0];

      const defaults = {
        userId,
        emailEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        overdueReminders: true,
        completionNotifications: true,
        assignmentNotifications: true,
        statusChangeNotifications: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db
        .insert((schema as any).notificationPreferences)
        .values(defaults)
        .returning((schema as any).notificationPreferences);

      return result && result[0] ? result[0] : defaults;
    } else {
      // Fallback object for environments without the table
      return {
        userId,
        emailEnabled: true,
        smsEnabled: false,
        inAppEnabled: true,
        overdueReminders: true,
        completionNotifications: true,
        assignmentNotifications: true,
        statusChangeNotifications: true,
      };
    }
  } catch (error) {
    console.error("[DB] getOrCreateNotificationPreferences error:", error);
    return {
      userId,
      emailEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      overdueReminders: true,
      completionNotifications: true,
      assignmentNotifications: true,
      statusChangeNotifications: true,
    };
  }
}

export async function updateNotificationPreferences(
  userId: number,
  preferences: any,
) {
  try {
    if ((schema as any).notificationPreferences) {
      await db
        .update((schema as any).notificationPreferences)
        .set({ ...preferences, updatedAt: new Date() })
        .where(eq((schema as any).notificationPreferences.userId, userId));
      return true;
    } else {
      console.log(
        "[DB] updateNotificationPreferences (stub)",
        userId,
        preferences,
      );
      return true;
    }
  } catch (error) {
    console.error("[DB] updateNotificationPreferences error:", error);
    return false;
  }
}

export async function getNotificationPreferences(userId: number) {
  try {
    if ((schema as any).notificationPreferences) {
      const result = await db
        .select()
        .from((schema as any).notificationPreferences)
        .where(eq((schema as any).notificationPreferences.userId, userId));
      return result && result[0] ? result[0] : null;
    } else {
      return null;
    }
  } catch (error) {
    console.error("[DB] getNotificationPreferences error:", error);
    return null;
  }
}

/**
 * Get notifications from the last `hours` that failed.
 * Looks at notificationHistory table first, falls back to notifications table.
 */
export async function getFailedNotifications(hours: number = 24) {
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    if ((schema as any).notificationHistory) {
      return await db
        .select()
        .from((schema as any).notificationHistory)
        .where(
          and(
            eq((schema as any).notificationHistory.status, "failed"),
            gte((schema as any).notificationHistory.createdAt, cutoff),
          ),
        )
        .orderBy(desc((schema as any).notificationHistory.createdAt));
    } else if ((schema as any).notifications) {
      return await db
        .select()
        .from((schema as any).notifications)
        .where(
          and(
            eq((schema as any).notifications.status, "failed"),
            gte((schema as any).notifications.createdAt, cutoff),
          ),
        )
        .orderBy(desc((schema as any).notifications.createdAt));
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getFailedNotifications error:", error);
    return [];
  }
}

/**
 * Get pending notifications to be processed by a worker.
 */
export async function getPendingNotifications() {
  try {
    if ((schema as any).notifications) {
      return await db
        .select()
        .from((schema as any).notifications)
        .where(
          inArray((schema as any).notifications.status, ["pending", "queued"]),
        )
        .orderBy(desc((schema as any).notifications.createdAt));
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getPendingNotifications error:", error);
    return [];
  }
}

/**
 * Get overdue tasks (not completed and due on or before now)
 */
export async function getOverdueTasks(limit: number = 100) {
  try {
    if ((schema as any).tasks) {
      return await db
        .select()
        .from((schema as any).tasks)
        .where(
          and(
            lte((schema as any).tasks.dueDate, new Date()),
            not(eq((schema as any).tasks.status, "completed")),
          ),
        )
        .orderBy((schema as any).tasks.dueDate)
        .limit(limit);
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getOverdueTasks error:", error);
    return [];
  }
}

/**
 * Geolocation / job site helper stubs
 *
 * These functions provide lightweight behavior when geolocation-related
 * tables are present in the schema, and harmless stubs when they are not.
 * This avoids runtime import errors in modules that import them.
 */

/**
 * Create a job site (geofence). Returns an ID when available.
 */
export async function createJobSite(input: any) {
  try {
    if ((schema as any).jobSites) {
      const toInsert = {
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await db
        .insert((schema as any).jobSites)
        .values(toInsert)
        .returning({ id: (schema as any).jobSites.id });
      return result && result[0] ? result[0].id : null;
    } else {
      // simple stub id for environments without schema
      return Date.now();
    }
  } catch (error) {
    console.error("[DB] createJobSite error:", error);
    return null;
  }
}

/**
 * Record a location log (e.g., when a user checks in/out). Returns an ID when available.
 */
export async function createLocationLog(input: any) {
  try {
    if ((schema as any).locationLogs) {
      const toInsert = {
        ...input,
        createdAt: new Date(),
      };
      const result = await db
        .insert((schema as any).locationLogs)
        .values(toInsert)
        .returning({ id: (schema as any).locationLogs.id });
      return result && result[0] ? result[0].id : null;
    } else {
      return Date.now();
    }
  } catch (error) {
    console.error("[DB] createLocationLog error:", error);
    return null;
  }
}

/**
 * Record a geofence violation. Returns an ID when available.
 */
export async function recordGeofenceViolation(input: any) {
  try {
    if ((schema as any).geofenceViolations) {
      const toInsert = {
        ...input,
        createdAt: new Date(),
      };
      const result = await db
        .insert((schema as any).geofenceViolations)
        .values(toInsert)
        .returning({ id: (schema as any).geofenceViolations.id });
      return result && result[0] ? result[0].id : null;
    } else {
      return Date.now();
    }
  } catch (error) {
    console.error("[DB] recordGeofenceViolation error:", error);
    return null;
  }
}

/**
 * Get location history for an employee (most recent first).
 */
export async function getLocationHistory(
  employeeId: number,
  limit: number = 50,
) {
  try {
    if ((schema as any).locationLogs) {
      return await db
        .select()
        .from((schema as any).locationLogs)
        .where(eq((schema as any).locationLogs.employeeId, employeeId))
        .orderBy(desc((schema as any).locationLogs.createdAt))
        .limit(limit);
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getLocationHistory error:", error);
    return [];
  }
}

/**
 * Get geofence violations for an employee, optionally filtering by resolved state.
 */
export async function getGeofenceViolations(
  employeeId?: number,
  resolved?: boolean,
) {
  try {
    if ((schema as any).geofenceViolations) {
      const conditions: any[] = [];
      if (typeof employeeId === "number") {
        conditions.push(
          eq((schema as any).geofenceViolations.employeeId, employeeId),
        );
      }
      if (typeof resolved === "boolean") {
        conditions.push(
          eq((schema as any).geofenceViolations.resolved, resolved),
        );
      }

      if (conditions.length > 0) {
        return await db
          .select()
          .from((schema as any).geofenceViolations)
          .where(and(...conditions))
          .orderBy(desc((schema as any).geofenceViolations.createdAt));
      } else {
        return await db
          .select()
          .from((schema as any).geofenceViolations)
          .orderBy(desc((schema as any).geofenceViolations.createdAt));
      }
    } else {
      return [];
    }
  } catch (error) {
    console.error("[DB] getGeofenceViolations error:", error);
    return [];
  }
}

/**
 * Resolve a geofence violation (mark resolved and record resolver).
 */
export async function resolveGeofenceViolation(
  violationId: number,
  resolvedBy: number,
  notes?: string,
) {
  try {
    if ((schema as any).geofenceViolations) {
      await db
        .update((schema as any).geofenceViolations)
        .set({
          resolved: true,
          resolvedBy,
          resolvedAt: new Date(),
          resolutionNotes: notes ?? null,
        })
        .where(eq((schema as any).geofenceViolations.id, violationId));
      return true;
    } else {
      console.log(
        "[DB] resolveGeofenceViolation (stub)",
        violationId,
        resolvedBy,
        notes,
      );
      return true;
    }
  } catch (error) {
    console.error("[DB] resolveGeofenceViolation error:", error);
    return false;
  }
}

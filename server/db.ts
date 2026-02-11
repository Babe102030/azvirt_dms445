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

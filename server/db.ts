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

export async function getAdminUsersWithSMS() {
  return db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.role, "admin"),
        eq(schema.users.smsNotificationsEnabled, true),
      ),
    );
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
  return db.select().from(schema.materials).orderBy(schema.materials.name);
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

export async function getDocuments(
  filters: { projectId?: number; type?: string } = {},
) {
  let query = db.select().from(schema.documents);
  const conditions = [];

  if (filters.projectId) {
    conditions.push(eq(schema.documents.projectId, filters.projectId));
  }
  if (filters.type) {
    conditions.push(eq(schema.documents.type, filters.type));
  }

  if (conditions.length > 0) {
    return query
      .where(and(...conditions))
      .orderBy(desc(schema.documents.createdAt));
  }
  return query.orderBy(desc(schema.documents.createdAt));
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

export async function getDeliveries(
  filters: { projectId?: number; status?: string } = {},
) {
  let query = db.select().from(schema.deliveries);
  const conditions = [];

  if (filters.projectId) {
    conditions.push(eq(schema.deliveries.projectId, filters.projectId));
  }
  if (filters.status) {
    conditions.push(eq(schema.deliveries.status, filters.status));
  }

  if (conditions.length > 0) {
    return query
      .where(and(...conditions))
      .orderBy(desc(schema.deliveries.scheduledTime));
  }
  return query.orderBy(desc(schema.deliveries.scheduledTime));
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

export async function getQualityTests(
  filters: { deliveryId?: number; projectId?: number } = {},
) {
  let query = db.select().from(schema.qualityTests);
  const conditions = [];

  if (filters.deliveryId) {
    conditions.push(eq(schema.qualityTests.deliveryId, filters.deliveryId));
  }
  if (filters.projectId) {
    conditions.push(eq(schema.qualityTests.projectId, filters.projectId));
  }

  if (conditions.length > 0) {
    return query
      .where(and(...conditions))
      .orderBy(desc(schema.qualityTests.testedAt));
  }
  return query.orderBy(desc(schema.qualityTests.testedAt));
}

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

  let dailyAverage = 0;
  let weeklyAverage = 0;
  let monthlyAverage = 0;
  let trendFactor = 1.0;
  let confidence = 0;
  let dataPoints = history.length;

  if (history.length > 0) {
    const totalUsed = history.reduce((sum, item) => sum + item.quantityUsed, 0);
    dailyAverage = totalUsed / days;
    // ... complex logic for trend analysis ...
    weeklyAverage = dailyAverage * 7;
    monthlyAverage = dailyAverage * 30;
    trendFactor = 1.05; // Dummy logic: increasing 5%
    confidence = Math.min(history.length / 10, 1);
    dataPoints = history.length;
  }

  return {
    dailyAverage,
    weeklyAverage,
    monthlyAverage,
    trendFactor,
    confidence,
    dataPoints,
  };
}

export async function predictStockoutDate(materialId: number) {
  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .get();

  if (!material) return null;

  const currentStock = material.quantity;
  const consumptionData = await calculateConsumptionRate(materialId);

  if (consumptionData.dailyAverage <= 0) return null;

  const daysUntilStockout =
    currentStock / (consumptionData.dailyAverage * consumptionData.trendFactor);
  const stockoutDate = new Date();
  stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);

  return stockoutDate;
}

export async function calculateReorderPoint(materialId: number) {
  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .get();

  if (!material) return null;

  const leadTimeDays = material.leadTimeDays || 7;
  const consumptionData = await calculateConsumptionRate(materialId);
  const dailyRate = consumptionData.dailyAverage;
  const safetyFactor = 1.5;
  const safetyStock = dailyRate * leadTimeDays * (safetyFactor - 1);
  const reorderPoint = dailyRate * leadTimeDays + safetyStock;

  return Math.ceil(reorderPoint);
}

export async function calculateOptimalOrderQuantity(materialId: number) {
  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .get();

  if (!material) return null;
  const consumptionData = await calculateConsumptionRate(materialId);
  // ... basic EOQ calculation or similar ...
  return Math.ceil(consumptionData.monthlyAverage * 1.5);
}

export async function generateForecastPredictions() {
  const materials = await getMaterials();
  const predictions = [];

  for (const material of materials) {
    const consumptionRate = await calculateConsumptionRate(material.id);
    const stockoutDate = await predictStockoutDate(material.id);
    const reorderPoint = await calculateReorderPoint(material.id);
    const optimalQty = await calculateOptimalOrderQuantity(material.id);

    const daysUntilStockout = stockoutDate
      ? Math.ceil(
          (stockoutDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24),
        )
      : 999;

    const needsReorder =
      material.quantity <= (reorderPoint || material.minStock);
    const urgency = needsReorder
      ? daysUntilStockout < 3
        ? "critical"
        : daysUntilStockout < 7
          ? "high"
          : "medium"
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
  const result = await db
    .insert(schema.notificationTemplates)
    .values({
      ...data,
      channels: JSON.stringify(data.channels || []),
      updatedAt: new Date(),
    })
    .returning({ id: schema.notificationTemplates.id });
  return { insertId: result[0].id };
}

export async function getNotificationTemplates() {
  const result = await db.select().from(schema.notificationTemplates);
  return result.map((t) => ({
    ...t,
    channels: t.channels ? JSON.parse(t.channels) : [],
  }));
}

export async function getNotificationTemplate(id: number) {
  const result = await db
    .select()
    .from(schema.notificationTemplates)
    .where(eq(schema.notificationTemplates.id, id));
  if (!result[0]) return null;
  return {
    ...result[0],
    channels: result[0].channels ? JSON.parse(result[0].channels) : [],
  };
}

export async function updateNotificationTemplate(id: number, data: any) {
  const updateData = { ...data };
  if (data.channels) {
    updateData.channels = JSON.stringify(data.channels);
  }
  await db
    .update(schema.notificationTemplates)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(schema.notificationTemplates.id, id));
  return true;
}

export async function deleteNotificationTemplate(id: number) {
  await db
    .delete(schema.notificationTemplates)
    .where(eq(schema.notificationTemplates.id, id));
  return true;
}

export async function createNotificationTrigger(data: any) {
  const result = await db
    .insert(schema.notificationTriggers)
    .values({
      ...data,
      triggerCondition: JSON.stringify(data.triggerCondition || {}),
      updatedAt: new Date(),
    })
    .returning({ id: schema.notificationTriggers.id });
  return { insertId: result[0].id };
}

export async function getNotificationTriggers() {
  const result = await db.select().from(schema.notificationTriggers);
  return result.map((t) => ({
    ...t,
    triggerCondition: t.triggerCondition ? JSON.parse(t.triggerCondition) : {},
  }));
}

export async function getNotificationTrigger(id: number) {
  const result = await db
    .select()
    .from(schema.notificationTriggers)
    .where(eq(schema.notificationTriggers.id, id));
  if (!result[0]) return null;
  return {
    ...result[0],
    triggerCondition: result[0].triggerCondition
      ? JSON.parse(result[0].triggerCondition)
      : {},
  };
}

export async function getTriggersByEventType(eventType: string) {
  const result = await db
    .select()
    .from(schema.notificationTriggers)
    .where(
      and(
        eq(schema.notificationTriggers.eventType, eventType),
        eq(schema.notificationTriggers.isActive, true),
      ),
    );
  return result.map((t) => ({
    ...t,
    triggerCondition: t.triggerCondition ? JSON.parse(t.triggerCondition) : {},
  }));
}

export async function updateNotificationTrigger(id: number, data: any) {
  const updateData = { ...data };
  if (data.triggerCondition) {
    updateData.triggerCondition = JSON.stringify(data.triggerCondition);
  }
  await db
    .update(schema.notificationTriggers)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(schema.notificationTriggers.id, id));
  return true;
}

export async function deleteNotificationTrigger(id: number) {
  await db
    .delete(schema.notificationTriggers)
    .where(eq(schema.notificationTriggers.id, id));
  return true;
}

export async function recordTriggerExecution(data: any) {
  const result = await db
    .insert(schema.triggerExecutionLogs)
    .values({
      ...data,
      createdAt: new Date(),
    })
    .returning({ id: schema.triggerExecutionLogs.id });
  return result[0]?.id;
}

export type NotificationHistoryInsert = {
  notificationId?: number;
  userId?: number;
  channel: string;
  status: string;
  recipient: string;
  errorMessage?: string;
};

export async function recordNotificationHistory(
  data: NotificationHistoryInsert,
) {
  try {
    const insertData = {
      notificationId: data.notificationId,
      userId: data.userId,
      channel: data.channel,
      status: data.status,
      recipient: data.recipient,
      errorMessage: data.errorMessage,
      createdAt: new Date(),
    };

    const result = await db
      .insert(schema.notificationHistory)
      .values(insertData)
      .returning({ id: schema.notificationHistory.id });
    return result[0]?.id;
  } catch (error) {
    console.error("[DB] recordNotificationHistory error:", error);
    return null;
  }
}

export async function getNotificationHistory(notificationId: number) {
  try {
    return db
      .select()
      .from(schema.notificationHistory)
      .where(eq(schema.notificationHistory.notificationId, notificationId))
      .orderBy(desc(schema.notificationHistory.createdAt));
  } catch (error) {
    console.error("[DB] getNotificationHistory error:", error);
    return [];
  }
}

export async function getNotificationHistoryByUser(
  userId: number,
  days: number = 7,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  try {
    return db
      .select()
      .from(schema.notificationHistory)
      .where(
        and(
          eq(schema.notificationHistory.userId, userId),
          gte(schema.notificationHistory.createdAt, cutoff),
        ),
      )
      .orderBy(desc(schema.notificationHistory.createdAt));
  } catch (error) {
    console.error("[DB] getNotificationHistoryByUser error:", error);
    return [];
  }
}

export async function createNotification(notification: any) {
  try {
    const toInsert = {
      ...notification,
      sentAt: notification.sentAt ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db
      .insert(schema.notifications)
      .values(toInsert)
      .returning({ id: schema.notifications.id });
    return result && result[0] ? result[0].id : null;
  } catch (error) {
    console.error("[DB] createNotification error:", error);
    return null;
  }
}

export async function getNotifications(userId: number) {
  return db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.sentAt));
}

export async function getUnreadNotifications(userId: number) {
  return db
    .select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.status, "unread"),
      ),
    )
    .orderBy(desc(schema.notifications.sentAt));
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    await db
      .update(schema.notifications)
      .set({ status: "read", updatedAt: new Date() } as any)
      .where(eq(schema.notifications.id, notificationId));
    return true;
  } catch (error) {
    console.error("[DB] markNotificationAsRead error:", error);
    return false;
  }
}

export async function getOrCreateNotificationPreferences(userId: number) {
  try {
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();

    return {
      emailEnabled: true,
      smsEnabled: existing?.smsNotificationsEnabled ?? false,
      inAppEnabled: true,
      overdueReminders: true,
      completionNotifications: true,
      assignmentNotifications: true,
      statusChangeNotifications: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      timezone: "UTC",
    };
  } catch (error) {
    console.error("[DB] getOrCreateNotificationPreferences error:", error);
    return null;
  }
}

export async function updateNotificationPreferences(
  userId: number,
  preferences: any,
) {
  try {
    if (preferences.smsEnabled !== undefined) {
      await db
        .update(schema.users)
        .set({
          smsNotificationsEnabled: preferences.smsEnabled,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    }
    return true;
  } catch (error) {
    console.error("[DB] updateNotificationPreferences error:", error);
    return false;
  }
}

export async function getNotificationPreferences(userId: number) {
  return getOrCreateNotificationPreferences(userId);
}

export async function getFailedNotifications(limit: number = 50) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30); // Last 30 days

  try {
    return db
      .select()
      .from(schema.notificationHistory)
      .where(
        and(
          eq(schema.notificationHistory.status, "failed"),
          gte(schema.notificationHistory.createdAt, cutoff),
        ),
      )
      .limit(limit)
      .orderBy(desc(schema.notificationHistory.createdAt));
  } catch (error) {
    console.error("[DB] getFailedNotifications error:", error);
    return [];
  }
}

export async function getPendingNotifications() {
  try {
    return db
      .select()
      .from(schema.notificationHistory)
      .where(eq(schema.notificationHistory.status, "pending"))
      .orderBy(desc(schema.notificationHistory.createdAt));
  } catch (error) {
    console.error("[DB] getPendingNotifications error:", error);
    return [];
  }
}

export async function getOverdueTasks(userId?: number) {
  const conditions = [
    lte(schema.tasks.dueDate, new Date()),
    not(eq(schema.tasks.status, "completed")),
  ];

  if (userId) {
    const userAssignments = await db
      .select({ taskId: schema.taskAssignments.taskId })
      .from(schema.taskAssignments)
      .where(eq(schema.taskAssignments.userId, userId));

    if (userAssignments.length > 0) {
      conditions.push(
        inArray(
          schema.tasks.id,
          userAssignments.map((a) => a.taskId),
        ),
      );
    } else {
      return []; // No tasks assigned to this user
    }
  }

  return db
    .select()
    .from(schema.tasks)
    .where(and(...conditions));
}

export async function createJobSite(data: any) {
  try {
    const toInsert = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db
      .insert(schema.projectSites)
      .values(toInsert)
      .returning({ id: schema.projectSites.id });
    return result[0].id;
  } catch (error) {
    console.error("[DB] createJobSite error:", error);
    return null;
  }
}

export async function createLocationLog(data: any) {
  try {
    const toInsert = {
      ...data,
      createdAt: new Date(),
    };
    const result = await db
      .insert(schema.checkInRecords)
      .values(toInsert)
      .returning({ id: schema.checkInRecords.id });
    return result[0].id;
  } catch (error) {
    console.error("[DB] createLocationLog error:", error);
    return null;
  }
}

export async function recordGeofenceViolation(data: any) {
  try {
    // Geofence violations are recorded in checkInRecords with isWithinGeofence=false
    return createLocationLog({ ...data, isWithinGeofence: false });
  } catch (error) {
    console.error("[DB] recordGeofenceViolation error:", error);
    return null;
  }
}

export async function getLocationHistory(employeeId: number, days: number = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return db
    .select()
    .from(schema.checkInRecords)
    .where(
      and(
        eq(schema.checkInRecords.employeeId, employeeId),
        gte(schema.checkInRecords.createdAt, cutoff),
      ),
    )
    .orderBy(desc(schema.checkInRecords.createdAt));
}

export async function getGeofenceViolations(
  filters: { employeeId?: number; siteId?: number } = {},
) {
  const conditions = [eq(schema.checkInRecords.isWithinGeofence, false)];

  if (filters.employeeId) {
    conditions.push(eq(schema.checkInRecords.employeeId, filters.employeeId));
  }
  if (filters.siteId) {
    conditions.push(eq(schema.checkInRecords.projectSiteId, filters.siteId));
  }

  return db
    .select()
    .from(schema.checkInRecords)
    .where(and(...conditions))
    .orderBy(desc(schema.checkInRecords.createdAt));
}

export async function resolveGeofenceViolation(
  violationId: number,
  resolvedBy: number,
  notes: string,
) {
  try {
    await db
      .update(schema.checkInRecords)
      .set({ notes: notes + ` (Resolved by ${resolvedBy})` } as any)
      .where(eq(schema.checkInRecords.id, violationId));
    return true;
  } catch (error) {
    console.error("[DB] resolveGeofenceViolation error:", error);
    return false;
  }
}

export async function getJobSites(projectId?: number) {
  let query = db.select().from(schema.projectSites);
  if (projectId) {
    return query.where(eq(schema.projectSites.projectId, projectId));
  }
  return query;
}

export async function getShiftById(id: number) {
  const result = await db
    .select()
    .from(schema.shifts)
    .where(eq(schema.shifts.id, id));
  return result[0];
}

export async function getEmployeeById(id: number) {
  const result = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id));
  return result[0];
}

export async function getSuppliers() {
  return db.select().from(schema.suppliers);
}

export async function getOrCreateSupplier(name: string) {
  const existing = await db
    .select()
    .from(schema.suppliers)
    .where(eq(schema.suppliers.name, name))
    .get();

  if (existing) return existing;

  const result = await db
    .insert(schema.suppliers)
    .values({
      name,
      email: null,
      contactPerson: null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

export async function createPurchaseOrder(data: any) {
  let supplierId = data.supplierId;
  if (!supplierId && data.supplierName) {
    const supplier = await getOrCreateSupplier(data.supplierName);
    supplierId = supplier.id;
  }

  const result = await db.transaction(async (tx) => {
    const po = await tx
      .insert(schema.purchaseOrders)
      .values({
        supplierId,
        orderDate: data.orderDate || new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate,
        status: "sent",
        totalCost: data.totalCost,
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: schema.purchaseOrders.id });

    const purchaseOrderId = po[0].id;
    await tx.insert(schema.purchaseOrderItems).values({
      purchaseOrderId,
      materialId: data.materialId,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
    });

    return purchaseOrderId;
  });

  return result;
}

export async function getPurchaseOrders() {
  const orders = await db
    .select({
      id: schema.purchaseOrders.id,
      supplierId: schema.purchaseOrders.supplierId,
      supplierName: schema.suppliers.name,
      supplierEmail: schema.suppliers.email,
      orderDate: schema.purchaseOrders.orderDate,
      expectedDelivery: schema.purchaseOrders.expectedDeliveryDate,
      actualDelivery: schema.purchaseOrders.actualDeliveryDate,
      status: schema.purchaseOrders.status,
      totalCost: schema.purchaseOrders.totalCost,
      notes: schema.purchaseOrders.notes,
      materialId: schema.purchaseOrderItems.materialId,
      materialName: schema.materials.name,
      quantity: schema.purchaseOrderItems.quantity,
      unitPrice: schema.purchaseOrderItems.unitPrice,
    })
    .from(schema.purchaseOrders)
    .leftJoin(
      schema.suppliers,
      eq(schema.purchaseOrders.supplierId, schema.suppliers.id),
    )
    .leftJoin(
      schema.purchaseOrderItems,
      eq(schema.purchaseOrders.id, schema.purchaseOrderItems.purchaseOrderId),
    )
    .leftJoin(
      schema.materials,
      eq(schema.purchaseOrderItems.materialId, schema.materials.id),
    )
    .orderBy(desc(schema.purchaseOrders.orderDate));

  // Map to structure if multiple items per order (though currently simplified)
  return orders;
}

export async function updatePurchaseOrder(id: number, data: any) {
  await db
    .update(schema.purchaseOrders)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.purchaseOrders.id, id));
  return true;
}

export async function receivePurchaseOrder(id: number) {
  return db.transaction(async (tx) => {
    await tx
      .update(schema.purchaseOrders)
      .set({ status: "received", actualDeliveryDate: new Date() })
      .where(eq(schema.purchaseOrders.id, id));

    const items = await tx
      .select()
      .from(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.purchaseOrderId, id));

    for (const item of items) {
      const material = await tx
        .select()
        .from(schema.materials)
        .where(eq(schema.materials.id, item.materialId))
        .get();

      if (material) {
        const currentQty = material.quantity || 0;
        const newQty = currentQty + item.quantity;
        await tx
          .update(schema.materials)
          .set({
            quantity: newQty,
            lastOrderDate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.materials.id, item.materialId));
      }
    }
    return true;
  });
}

export async function createSupplier(data: any) {
  const result = await db
    .insert(schema.suppliers)
    .values({
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

export async function updateSupplier(id: number, data: any) {
  await db
    .update(schema.suppliers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.suppliers.id, id));
  return true;
}

export async function deleteSupplier(id: number) {
  return db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
}

export async function createTask(data: any) {
  const result = await db
    .insert(schema.tasks)
    .values({
      title: data.title,
      description: data.description,
      priority: data.priority || "medium",
      dueDate: data.dueDate,
      projectId: data.projectId,
      createdBy: data.createdBy,
      status: data.status || "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

export async function getTasks(
  filters: { projectId?: number; status?: string; userId?: number } = {},
) {
  const tasks = await db
    .select({
      id: schema.tasks.id,
      title: schema.tasks.title,
      description: schema.tasks.description,
      status: schema.tasks.status,
      priority: schema.tasks.priority,
      dueDate: schema.tasks.dueDate,
      projectId: schema.tasks.projectId,
      createdBy: schema.tasks.createdBy,
      createdAt: schema.tasks.createdAt,
      updatedAt: schema.tasks.updatedAt,
    })
    .from(schema.tasks)
    .orderBy(desc(schema.tasks.createdAt));

  const tasksWithAssignments = [];
  for (const task of tasks) {
    const assignments = await db
      .select({ userId: schema.taskAssignments.userId })
      .from(schema.taskAssignments)
      .where(eq(schema.taskAssignments.taskId, task.id));

    tasksWithAssignments.push({
      ...task,
      assignedTo: assignments.map((a) => a.userId),
    });
  }
  return tasksWithAssignments;
}

export async function getTaskById(id: number) {
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id));

  if (tasks.length === 0) return null;
  const task = tasks[0];

  const assignments = await db
    .select({ userId: schema.taskAssignments.userId })
    .from(schema.taskAssignments)
    .where(eq(schema.taskAssignments.taskId, task.id));

  return {
    ...task,
    assignedTo: assignments.map((a) => a.userId),
  };
}

export async function updateTask(id: number, data: any) {
  const { assignedTo, ...updateData } = data;
  await db
    .update(schema.tasks)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(schema.tasks.id, id));

  if (assignedTo !== undefined) {
    await db
      .delete(schema.taskAssignments)
      .where(eq(schema.taskAssignments.taskId, id));
    for (const userId of assignedTo) {
      await assignTask(id, userId);
    }
  }
  return true;
}

export async function deleteTask(id: number) {
  return db.delete(schema.tasks).where(eq(schema.tasks.id, id));
}

export async function assignTask(taskId: number, userId: number) {
  const existing = await db
    .select()
    .from(schema.taskAssignments)
    .where(
      and(
        eq(schema.taskAssignments.taskId, taskId),
        eq(schema.taskAssignments.userId, userId),
      ),
    )
    .get();

  if (existing) return existing;

  return db
    .insert(schema.taskAssignments)
    .values({
      taskId,
      userId,
      assignedAt: new Date(),
    })
    .returning();
}

export async function createAiConversation(data: any) {
  const result = await db
    .insert(schema.aiConversations)
    .values({
      userId: data.userId,
      title: data.title,
      modelName: data.modelName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return result[0];
}

export async function getAiMessages(conversationId: number) {
  return db
    .select()
    .from(schema.aiMessages)
    .where(eq(schema.aiMessages.conversationId, conversationId))
    .orderBy(schema.aiMessages.createdAt);
}

export async function createAiMessage(data: any) {
  const result = await db
    .insert(schema.aiMessages)
    .values({
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      metadata: data.metadata,
      createdAt: new Date(),
    })
    .returning();
  return result[0];
}

export async function deleteAiConversation(conversationId: number) {
  return db.transaction(async (tx) => {
    await tx
      .delete(schema.aiMessages)
      .where(eq(schema.aiMessages.conversationId, conversationId));
    await tx
      .delete(schema.aiConversations)
      .where(eq(schema.aiConversations.id, conversationId));
    return true;
  });
}

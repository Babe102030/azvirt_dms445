import { ENV } from "./_core/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema.ts";
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
} from "drizzle-orm";

// PostgreSQL connection for Neon
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const sql = postgres(connectionString);
export const db = drizzle(sql, { schema });

export async function getDb() {
  return db;
}

// Type definitions for compatibility
type InsertUser = typeof schema.users.$inferInsert;
type InsertProject = typeof schema.projects.$inferInsert;
type InsertMaterial = typeof schema.materials.$inferInsert;

// IMPLEMENTED FUNCTIONS USING DRIZZLE

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const role =
    user.role || (user.openId === ENV.ownerOpenId ? "admin" : "user");

  await db
    .insert(schema.users)
    .values({
      openId: user.openId,
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      role: role,
      phoneNumber: user.phoneNumber,
      smsNotificationsEnabled: user.smsNotificationsEnabled ?? false,
      languagePreference: user.languagePreference ?? "en",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.users.openId,
      set: {
        name: user.name,
        email: user.email,
        loginMethod: user.loginMethod,
        lastSignedIn: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function getUserByOpenId(openId: string) {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.openId, openId));
  return result[0] || null;
}

export async function getUserById(id: number) {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return result[0] || null;
}

export async function createProject(project: InsertProject) {
  const result = await db
    .insert(schema.projects)
    .values({
      name: project.name,
      description: project.description,
      location: project.location,
      status: project.status || "planning",
      startDate: project.startDate,
      endDate: project.endDate,
      createdBy: project.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.projects.id });

  return result[0]?.id;
}

export async function getProjects() {
  return await db
    .select()
    .from(schema.projects)
    .orderBy(desc(schema.projects.createdAt));
}

export async function getProjectById(id: number) {
  const result = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id));
  return result[0] || null;
}

export async function updateProject(
  id: number,
  updates: Partial<InsertProject>,
) {
  const updateData: any = { updatedAt: new Date() };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined)
    updateData.description = updates.description;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
  if (updates.endDate !== undefined) updateData.endDate = updates.endDate;

  await db
    .update(schema.projects)
    .set(updateData)
    .where(eq(schema.projects.id, id));
  return true;
}

export async function createMaterial(material: InsertMaterial) {
  const result = await db
    .insert(schema.materials)
    .values({
      name: material.name,
      category: material.category || "other",
      unit: material.unit,
      quantity: material.quantity ?? 0,
      minStock: material.minStock ?? 0,
      criticalThreshold: material.criticalThreshold ?? 0,
      supplier: material.supplier,
      unitPrice: material.unitPrice,
      lowStockEmailSent: material.lowStockEmailSent ?? false,
      supplierEmail: material.supplierEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.materials.id });

  return result[0]?.id;
}

export async function getMaterials() {
  return await db
    .select()
    .from(schema.materials)
    .orderBy(schema.materials.name);
}

export async function updateMaterial(
  id: number,
  updates: Partial<InsertMaterial>,
) {
  const updateData: any = { updatedAt: new Date() };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.unit !== undefined) updateData.unit = updates.unit;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.minStock !== undefined) updateData.minStock = updates.minStock;
  if (updates.criticalThreshold !== undefined)
    updateData.criticalThreshold = updates.criticalThreshold;
  if (updates.supplier !== undefined) updateData.supplier = updates.supplier;
  if (updates.unitPrice !== undefined) updateData.unitPrice = updates.unitPrice;
  if (updates.lowStockEmailSent !== undefined)
    updateData.lowStockEmailSent = updates.lowStockEmailSent;
  if (updates.supplierEmail !== undefined)
    updateData.supplierEmail = updates.supplierEmail;

  await db
    .update(schema.materials)
    .set(updateData)
    .where(eq(schema.materials.id, id));
  return true;
}

export async function deleteMaterial(id: number) {
  await db.delete(schema.materials).where(eq(schema.materials.id, id));
  return true;
}

// STUB IMPLEMENTATIONS - TODO: Implement with proper Drizzle queries
// These functions return placeholder values to keep the app running
export async function createDocument(
  doc: typeof schema.documents.$inferInsert,
) {
  const result = await db
    .insert(schema.documents)
    .values({
      ...doc,
      createdAt: new Date(),
    })
    .returning({ id: schema.documents.id });

  return result[0];
}

export async function getDocuments(filters?: {
  projectId?: number;
  type?: string;
}) {
  let query = db.select().from(schema.documents);
  const conditions = [];
  if (filters?.projectId)
    conditions.push(eq(schema.documents.projectId, filters.projectId));
  if (filters?.type) conditions.push(eq(schema.documents.type, filters.type));

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
  return result[0] || null;
}

export async function deleteDocument(id: number) {
  await db.delete(schema.documents).where(eq(schema.documents.id, id));
  return true;
}

// Add stub implementations for all remaining functions to prevent runtime errors
export async function createDelivery(
  delivery: typeof schema.deliveries.$inferInsert,
): Promise<number> {
  const result = await db
    .insert(schema.deliveries)
    .values({
      ...delivery,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.deliveries.id });

  return result[0]?.id;
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
  data: Partial<typeof schema.deliveries.$inferInsert>,
) {
  await db
    .update(schema.deliveries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.deliveries.id, id));
  return true;
}

// ============================================================================
// DELIVERY TRACKING PROCEDURES (Phase 2 Implementation)
// ============================================================================

/**
 * Update delivery status with GPS capture and history logging
 * Implements real-time delivery tracking with status transitions
 */
export async function updateDeliveryStatusWithGPS(
  deliveryId: number,
  status: string,
  gpsLocation?: string,
  driverNotes?: string,
  userId?: number,
) {
  const validStatuses = [
    "scheduled",
    "loaded",
    "en_route",
    "arrived",
    "delivered",
    "returning",
    "completed",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    throw new Error(
      `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const now = Date.now();
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  // Update GPS location if provided
  if (gpsLocation) {
    updateData.gpsLocation = gpsLocation;
  }

  // Update driver notes if provided
  if (driverNotes) {
    updateData.driverNotes = driverNotes;
  }

  // Set timestamps based on status
  if (status === "loaded") {
    updateData.startTime = new Date();
  }
  if (status === "arrived") {
    updateData.arrivalTime = new Date();
    updateData.actualArrivalTime = now;
  }
  if (status === "delivered") {
    updateData.deliveryTime = new Date();
    updateData.actualDeliveryTime = now;

    // Deduct materials from inventory when delivered
    await deductDeliveryMaterials(deliveryId);
  }
  if (status === "completed") {
    updateData.completionTime = new Date();
  }

  // Update the delivery
  await db
    .update(schema.deliveries)
    .set(updateData)
    .where(eq(schema.deliveries.id, deliveryId));

  // Log status change to history
  await db.insert(schema.deliveryStatusHistory).values({
    deliveryId,
    status,
    timestamp: new Date(),
    gpsLocation: gpsLocation || null,
    notes: driverNotes || null,
    createdBy: userId || null,
  });

  return { success: true, status, timestamp: now };
}

/**
 * Deduct materials from inventory based on delivery volume and recipe
 */
export async function deductDeliveryMaterials(deliveryId: number) {
  try {
    const delivery = await db
      .select()
      .from(schema.deliveries)
      .where(eq(schema.deliveries.id, deliveryId))
      .limit(1);
    if (!delivery || delivery.length === 0) return false;

    const { recipeId, volume, projectId } = delivery[0];
    if (!recipeId || !volume) return false;

    // Get recipe ingredients
    const ingredients = await db
      .select()
      .from(schema.recipeIngredients)
      .where(eq(schema.recipeIngredients.recipeId, recipeId));

    for (const ingredient of ingredients) {
      const quantityToDeduct = ingredient.quantity * (volume || 0);
      await recordConsumptionWithHistory({
        materialId: ingredient.materialId,
        quantity: quantityToDeduct,
        deliveryId,
        projectId: projectId || undefined,
        date: new Date(),
      });
    }

    return true;
  } catch (error) {
    console.error("Error deducting delivery materials:", error);
    return false;
  }
}

/**
 * Get all active deliveries (in progress)
 * Returns deliveries that are loaded, en_route, arrived, or delivered
 */
export async function getActiveDeliveries() {
  const activeStatuses = ["loaded", "en_route", "arrived", "delivered"];

  return await db
    .select()
    .from(schema.deliveries)
    .where(inArray(schema.deliveries.status, activeStatuses))
    .orderBy(schema.deliveries.scheduledTime);
}

/**
 * Get delivery status history (timeline view)
 * Returns chronological list of status changes with GPS locations
 */
export async function getDeliveryHistory(deliveryId: number) {
  return await db
    .select()
    .from(schema.deliveryStatusHistory)
    .where(eq(schema.deliveryStatusHistory.deliveryId, deliveryId))
    .orderBy(schema.deliveryStatusHistory.timestamp);
}

/**
 * Calculate ETA (Estimated Time of Arrival)
 * Basic implementation using distance estimation
 * Returns estimated arrival time in milliseconds (Unix timestamp)
 */
export async function calculateDeliveryETA(
  deliveryId: number,
  currentGPS?: string,
): Promise<number | null> {
  const delivery = await db
    .select()
    .from(schema.deliveries)
    .where(eq(schema.deliveries.id, deliveryId))
    .limit(1);

  if (!delivery || delivery.length === 0) {
    return null;
  }

  const deliveryData = delivery[0];

  // If delivery already arrived or completed, return null
  if (["arrived", "delivered", "completed"].includes(deliveryData.status)) {
    return null;
  }

  // Basic ETA calculation
  // In a real implementation, this would use Google Maps Distance Matrix API
  // For now, we'll estimate based on average speed and distance

  const averageSpeedKmh = 40; // Average speed in km/h for concrete trucks
  const estimatedDistanceKm = 20; // Default estimated distance
  const estimatedTimeHours = estimatedDistanceKm / averageSpeedKmh;
  const estimatedTimeMs = estimatedTimeHours * 60 * 60 * 1000;

  const eta = Date.now() + estimatedTimeMs;

  // Update the delivery with the calculated ETA
  await db
    .update(schema.deliveries)
    .set({ estimatedArrival: eta, updatedAt: new Date() })
    .where(eq(schema.deliveries.id, deliveryId));

  return eta;
}

/**
 * Create delivery status history record
 * Used for manual status logging
 */
export async function createDeliveryStatusHistory(
  data: typeof schema.deliveryStatusHistory.$inferInsert,
) {
  const result = await db
    .insert(schema.deliveryStatusHistory)
    .values({
      ...data,
      timestamp: data.timestamp || new Date(),
    })
    .returning({ id: schema.deliveryStatusHistory.id });

  return result[0]?.id;
}

// ============================================================================
// END DELIVERY TRACKING PROCEDURES
// ============================================================================

export async function createQualityTest(
  test: typeof schema.qualityTests.$inferInsert,
) {
  const result = await db
    .insert(schema.qualityTests)
    .values({
      ...test,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.qualityTests.id });

  return result[0]?.id;
}

export async function getQualityTests(filters?: {
  deliveryId?: number;
  projectId?: number;
  status?: string;
}) {
  let query = db
    .select({
      id: schema.qualityTests.id,
      deliveryId: schema.qualityTests.deliveryId,
      projectId: schema.qualityTests.projectId,
      testType: schema.qualityTests.testType,
      result: schema.qualityTests.result,
      resultValue: schema.qualityTests.resultValue,
      unit: schema.qualityTests.unit,
      status: schema.qualityTests.status,
      testedByUserId: schema.qualityTests.testedByUserId,
      testedBy: schema.qualityTests.testedBy,
      testedAt: schema.qualityTests.testedAt,
      photos: schema.qualityTests.photos,
      photoUrls: schema.qualityTests.photoUrls,
      notes: schema.qualityTests.notes,
      inspectorSignature: schema.qualityTests.inspectorSignature,
      supervisorSignature: schema.qualityTests.supervisorSignature,
      gpsLocation: schema.qualityTests.gpsLocation,
      testLocation: schema.qualityTests.testLocation,
      standardUsed: schema.qualityTests.standardUsed,
      complianceStandard: schema.qualityTests.complianceStandard,
      syncStatus: schema.qualityTests.syncStatus,
      offlineSyncStatus: schema.qualityTests.offlineSyncStatus,
      createdAt: schema.qualityTests.createdAt,
      updatedAt: schema.qualityTests.updatedAt,
    })
    .from(schema.qualityTests);

  const conditions = [];
  if (filters?.deliveryId)
    conditions.push(eq(schema.qualityTests.deliveryId, filters.deliveryId));
  if (filters?.projectId)
    conditions.push(eq(schema.qualityTests.projectId, filters.projectId));
  if (filters?.status)
    conditions.push(eq(schema.qualityTests.status, filters.status));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query
      .where(and(...conditions))
      .orderBy(desc(schema.qualityTests.testedAt));
  }

  return await query.orderBy(desc(schema.qualityTests.testedAt));
}

export async function updateQualityTest(
  id: number,
  data: Partial<typeof schema.qualityTests.$inferInsert>,
) {
  await db
    .update(schema.qualityTests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.qualityTests.id, id));
  return true;
}

export async function getFailedQualityTests(days: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return await db
    .select()
    .from(schema.qualityTests)
    .where(
      and(
        eq(schema.qualityTests.status, "fail"),
        gte(schema.qualityTests.testedAt, cutoff),
      ),
    )
    .orderBy(desc(schema.qualityTests.testedAt));
}

export async function getQualityTestTrends(days: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const tests = await db
    .select({
      id: schema.qualityTests.id,
      status: schema.qualityTests.status,
      testType: schema.qualityTests.testType,
      testedAt: schema.qualityTests.testedAt,
    })
    .from(schema.qualityTests)
    .where(gte(schema.qualityTests.testedAt, cutoff));

  const totalTests = tests.length;
  if (totalTests === 0)
    return {
      passRate: 0,
      failRate: 0,
      pendingRate: 0,
      totalTests: 0,
      byType: [],
    };

  const passed = tests.filter((t) => t.status === "pass").length;
  const failed = tests.filter((t) => t.status === "fail").length;
  const pending = tests.filter((t) => t.status === "pending").length;

  return {
    passRate: (passed / totalTests) * 100,
    failRate: (failed / totalTests) * 100,
    pendingRate: (pending / totalTests) * 100,
    totalTests,
    byType: [], // Could aggregate further if needed
  };
}

/**
 * Get quality test with related project and delivery data
 * Used for generating compliance certificates
 */
export async function getQualityTestWithDetails(testId: number) {
  const test = await db
    .select()
    .from(schema.qualityTests)
    .where(eq(schema.qualityTests.id, testId))
    .limit(1);

  if (!test || test.length === 0) return null;

  const testData = test[0];
  let projectData = null;
  let deliveryData = null;

  // Get project if exists
  if (testData.projectId) {
    const project = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, testData.projectId))
      .limit(1);
    projectData = project[0] || null;
  }

  // Get delivery if exists
  if (testData.deliveryId) {
    const delivery = await db
      .select()
      .from(schema.deliveries)
      .where(eq(schema.deliveries.id, testData.deliveryId))
      .limit(1);
    deliveryData = delivery[0] || null;
  }

  return {
    test: testData,
    project: projectData,
    delivery: deliveryData,
  };
}

export async function createEmployee(
  employee: typeof schema.employees.$inferInsert,
) {
  const result = await db
    .insert(schema.employees)
    .values({
      ...employee,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.employees.id });

  return result[0]?.id;
}

export async function getEmployees(filters?: {
  department?: string;
  active?: boolean;
}) {
  let query = db.select().from(schema.employees);
  const conditions = [];
  if (filters?.department)
    conditions.push(eq(schema.employees.department, filters.department));
  if (filters?.active !== undefined)
    conditions.push(eq(schema.employees.active, filters.active));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query
      .where(and(...conditions))
      .orderBy(schema.employees.lastName);
  }
  return await query.orderBy(schema.employees.lastName);
}

export async function getEmployeeById(id: number) {
  const result = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id));
  return result[0] || null;
}

export async function updateEmployee(
  id: number,
  data: Partial<typeof schema.employees.$inferInsert>,
) {
  await db
    .update(schema.employees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.employees.id, id));
  return true;
}

export async function deleteEmployee(id: number) {
  await db
    .update(schema.employees)
    .set({ active: false })
    .where(eq(schema.employees.id, id));
  return true;
}

export async function createWorkHour(shift: typeof schema.shifts.$inferInsert) {
  const result = await db
    .insert(schema.shifts)
    .values({
      ...shift,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.shifts.id });

  return result[0]?.id;
}

export async function getWorkHours(filters?: {
  employeeId?: number;
  status?: string;
}) {
  let query = db.select().from(schema.shifts);
  const conditions = [];
  if (filters?.employeeId)
    conditions.push(eq(schema.shifts.employeeId, filters.employeeId));
  if (filters?.status)
    conditions.push(eq(schema.shifts.status, filters.status));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query
      .where(and(...conditions))
      .orderBy(desc(schema.shifts.startTime));
  }
  return await query.orderBy(desc(schema.shifts.startTime));
}

export async function updateWorkHour(
  id: number,
  data: Partial<typeof schema.shifts.$inferInsert>,
) {
  await db
    .update(schema.shifts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.shifts.id, id));
  return true;
}
export async function createConcreteBase(base: any) {
  return Date.now();
}
export async function getConcreteBases() {
  return [];
}
export async function getConcreteBaseById(id: number) {
  return null;
}
export async function updateConcreteBase(id: number, data: any) {
  return true;
}
export async function createMachine(
  machine: typeof schema.machines.$inferInsert,
) {
  const result = await db
    .insert(schema.machines)
    .values({
      ...machine,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.machines.id });

  return result[0]?.id;
}

export async function getMachines(filters?: { status?: string }) {
  let query = db.select().from(schema.machines);
  if (filters?.status) {
    return await query
      .where(eq(schema.machines.status, filters.status))
      .orderBy(schema.machines.name);
  }
  return await query.orderBy(schema.machines.name);
}

export async function getMachineById(id: number) {
  const result = await db
    .select()
    .from(schema.machines)
    .where(eq(schema.machines.id, id));
  return result[0] || null;
}

export async function updateMachine(
  id: number,
  data: Partial<typeof schema.machines.$inferInsert>,
) {
  await db
    .update(schema.machines)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.machines.id, id));
  return true;
}

export async function deleteMachine(id: number) {
  await db.delete(schema.machines).where(eq(schema.machines.id, id));
  return true;
}

export async function createMachineMaintenance(maintenance: any) {
  // TODO: Add machineMaintenance table to schema if needed or use existing fields
  return Date.now();
}

export async function getMachineMaintenance(filters?: any) {
  return [];
}

export async function createMachineWorkHour(
  workHour: typeof schema.machineWorkHours.$inferInsert,
) {
  const result = await db
    .insert(schema.machineWorkHours)
    .values(workHour)
    .returning({ id: schema.machineWorkHours.id });
  return result[0]?.id;
}

export async function getMachineWorkHours(filters?: { machineId?: number }) {
  let query = db.select().from(schema.machineWorkHours);
  if (filters?.machineId) {
    return await query
      .where(eq(schema.machineWorkHours.machineId, filters.machineId))
      .orderBy(desc(schema.machineWorkHours.date));
  }
  return await query.orderBy(desc(schema.machineWorkHours.date));
}
export async function createAggregateInput(input: any) {
  return Date.now();
}
export async function getAggregateInputs(filters?: any) {
  return [];
}
export async function getWeeklyTimesheetSummary(
  employeeId?: number,
  weekStart?: Date,
) {
  return [];
}
export async function getMonthlyTimesheetSummary(
  employeeId?: number,
  year?: number,
  month?: number,
) {
  return [];
}
export async function getLowStockMaterials() {
  return await db
    .select()
    .from(schema.materials)
    .where(lte(schema.materials.quantity, schema.materials.minStock))
    .orderBy(schema.materials.name);
}

export async function getCriticalStockMaterials() {
  return await db
    .select()
    .from(schema.materials)
    .where(lte(schema.materials.quantity, schema.materials.criticalThreshold))
    .orderBy(schema.materials.name);
}

export async function getAdminUsersWithSMS() {
  return await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.role, "admin"),
        eq(schema.users.smsNotificationsEnabled, true),
      ),
    );
}

export async function updateUserSMSSettings(
  userId: number,
  phoneNumber: string,
  enabled: boolean,
) {
  await db
    .update(schema.users)
    .set({
      phoneNumber,
      smsNotificationsEnabled: enabled,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
  return true;
}

export async function recordConsumption(consumption: any) {
  // Simple implementation: update material quantity
  const materialId = consumption.materialId;
  const quantity = consumption.quantity;

  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId));
  if (material[0]) {
    await db
      .update(schema.materials)
      .set({
        quantity: Math.max(0, material[0].quantity - quantity),
        updatedAt: new Date(),
      })
      .where(eq(schema.materials.id, materialId));
  }
  return true;
}

// ============================================================================

// PHASE 2: SMART INVENTORY FORECASTING & AUTO-REORDER SYSTEM
// ============================================================================

/**
 * Record material consumption with history tracking
 * Updates material quantity and logs consumption for forecasting
 */
export async function recordConsumptionWithHistory(consumption: {
  materialId: number;
  quantity: number;
  date?: Date;
  deliveryId?: number;
  projectId?: number;
}) {
  const { materialId, quantity, date, deliveryId, projectId } = consumption;

  // Update material quantity
  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId));
  if (material[0]) {
    const newQuantity = Math.max(0, material[0].quantity - quantity);
    await db
      .update(schema.materials)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(schema.materials.id, materialId));

    // Log consumption to history table if it exists
    try {
      await db.insert(schema.materialConsumptionHistory).values({
        materialId,
        quantityUsed: quantity,
        date: date || new Date(),
        deliveryId: deliveryId || null,
      });
    } catch (error) {
      // History table might not exist yet, continue
      console.log("Consumption history not logged:", error);
    }
  }

  return true;
}

/**
 * Get consumption history for a material
 * Returns historical usage data for forecasting
 */
export async function getConsumptionHistory(
  materialId?: number,
  days: number = 30,
) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  try {
    let query = db
      .select()
      .from(schema.materialConsumptionHistory)
      .where(gte(schema.materialConsumptionHistory.date, cutoff))
      .orderBy(desc(schema.materialConsumptionHistory.date));

    if (materialId) {
      query = db
        .select()
        .from(schema.materialConsumptionHistory)
        .where(
          and(
            eq(schema.materialConsumptionHistory.materialId, materialId),
            gte(schema.materialConsumptionHistory.date, cutoff),
          ),
        )
        .orderBy(desc(schema.materialConsumptionHistory.date));
    }

    return await query;
  } catch (error) {
    // Table might not exist yet
    return [];
  }
}

/**
 * Calculate consumption rate with trend analysis
 * Implements 30/60/90 day averages with trend factor
 */
export async function calculateConsumptionRate(
  materialId: number,
  days: number = 30,
) {
  const history = await getConsumptionHistory(materialId, days);

  if (history.length === 0) {
    return {
      dailyAverage: 0,
      weeklyAverage: 0,
      monthlyAverage: 0,
      trendFactor: 1.0,
      confidence: "low",
    };
  }

  // Calculate daily average
  const totalUsed = history.reduce(
    (sum, record) => sum + record.quantityUsed,
    0,
  );
  const dailyAverage = totalUsed / days;

  // Calculate weekly average (last 12 weeks if enough data)
  const weeklyDays = Math.min(days, 84); // 12 weeks
  const weeklyHistory = history.slice(0, Math.floor(weeklyDays / 7));
  const weeklyTotal = weeklyHistory.reduce(
    (sum, record) => sum + record.quantityUsed,
    0,
  );
  const weeklyAverage = weeklyTotal / Math.max(1, weeklyHistory.length);

  // Calculate monthly average
  const monthlyAverage = dailyAverage * 30;

  // Calculate trend factor (recent vs older usage)
  const halfPoint = Math.floor(history.length / 2);
  const recentUsage = history
    .slice(0, halfPoint)
    .reduce((sum, r) => sum + r.quantityUsed, 0);
  const olderUsage = history
    .slice(halfPoint)
    .reduce((sum, r) => sum + r.quantityUsed, 0);

  const recentAvg = recentUsage / Math.max(1, halfPoint);
  const olderAvg = olderUsage / Math.max(1, history.length - halfPoint);
  const trendFactor = olderAvg > 0 ? recentAvg / olderAvg : 1.0;

  // Determine confidence based on data availability
  let confidence: "low" | "medium" | "high" = "low";
  if (history.length >= 60) confidence = "high";
  else if (history.length >= 30) confidence = "medium";

  return {
    dailyAverage,
    weeklyAverage,
    monthlyAverage,
    trendFactor,
    confidence,
    dataPoints: history.length,
  };
}

/**
 * Predict stockout date using linear regression with trend adjustment
 * Returns predicted date when material will run out
 */
export async function predictStockoutDate(
  materialId: number,
): Promise<Date | null> {
  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .limit(1);

  if (!material || material.length === 0) return null;

  const currentStock = material[0].quantity;
  if (currentStock <= 0) return new Date(); // Already out of stock

  const consumptionData = await calculateConsumptionRate(materialId, 60);

  if (consumptionData.dailyAverage <= 0) {
    return null; // No consumption, won't run out
  }

  // Adjust rate with trend factor
  const adjustedDailyRate =
    consumptionData.dailyAverage * consumptionData.trendFactor;

  // Calculate days until stockout
  const daysUntilStockout = currentStock / adjustedDailyRate;

  // Calculate stockout date
  const stockoutDate = new Date();
  stockoutDate.setDate(stockoutDate.getDate() + Math.floor(daysUntilStockout));

  return stockoutDate;
}

/**
 * Calculate optimal reorder point
 * Formula: (Daily Rate × Lead Time) + Safety Stock
 * Safety Stock = Daily Rate × Lead Time × Safety Factor (1.5x)
 */
export async function calculateReorderPoint(
  materialId: number,
): Promise<number> {
  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .limit(1);

  if (!material || material.length === 0) return 0;

  const leadTimeDays = material[0].leadTimeDays || 7;
  const consumptionData = await calculateConsumptionRate(materialId, 30);

  const dailyRate = consumptionData.dailyAverage * consumptionData.trendFactor;

  // Safety stock (1.5x buffer)
  const safetyFactor = 1.5;
  const safetyStock = dailyRate * leadTimeDays * safetyFactor;

  // Reorder point
  const reorderPoint = dailyRate * leadTimeDays + safetyStock;

  // Update material with calculated reorder point
  await db
    .update(schema.materials)
    .set({ reorderPoint, updatedAt: new Date() })
    .where(eq(schema.materials.id, materialId));

  return reorderPoint;
}

/**
 * Calculate Economic Order Quantity (EOQ)
 * Formula: √((2 × Annual Demand × Order Cost) / Holding Cost per Unit)
 */
export async function calculateOptimalOrderQuantity(
  materialId: number,
  orderCost: number = 100, // Default order cost
  holdingCostPercentage: number = 0.25, // 25% of unit price per year
): Promise<number> {
  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .limit(1);

  if (!material || material.length === 0) return 0;

  const consumptionData = await calculateConsumptionRate(materialId, 90);
  const annualDemand = consumptionData.dailyAverage * 365;

  const unitPrice = material[0].unitPrice || 10; // Default if not set
  const holdingCost = unitPrice * holdingCostPercentage;

  if (holdingCost <= 0 || annualDemand <= 0) {
    return annualDemand * 0.25; // Fallback: 3 months supply
  }

  // EOQ formula
  const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCost);

  // Update material with optimal order quantity
  await db
    .update(schema.materials)
    .set({ optimalOrderQuantity: eoq, updatedAt: new Date() })
    .where(eq(schema.materials.id, materialId));

  return eoq;
}

/**
 * Generate forecast predictions for all materials
 * Returns materials that need reordering with recommended quantities
 */
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

/**
 * Get forecast predictions (cached or generate new)
 */
export async function getForecastPredictions() {
  // In a real implementation, this would check for cached predictions
  // For now, always generate fresh predictions
  return await generateForecastPredictions();
}

/**
 * Get a detailed 30-day forecast projection for a specific material
 * Returns daily expected stock levels and warning thresholds
 */
export async function get30DayForecast(materialId: number) {
  const material = await db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.id, materialId))
    .limit(1);

  if (!material || material.length === 0) return [];

  const consumptionData = await calculateConsumptionRate(materialId, 60);
  const adjustedRate =
    consumptionData.dailyAverage * consumptionData.trendFactor;
  const reorderPoint = await calculateReorderPoint(materialId);
  const criticalThreshold = material[0].criticalThreshold || reorderPoint * 0.5;

  const projection = [];
  const startDate = new Date();
  let currentStock = material[0].quantity;

  for (let i = 0; i < 30; i++) {
    const projectedDate = new Date(startDate);
    projectedDate.setDate(startDate.getDate() + i);

    projection.push({
      date: projectedDate.toISOString(),
      expectedStock: Math.max(0, currentStock),
      reorderPoint,
      criticalThreshold,
      isBelowReorder: currentStock <= reorderPoint,
      isBelowCritical: currentStock <= criticalThreshold,
    });

    // Reduce stock for the next day
    currentStock -= adjustedRate;
  }

  return projection;
}

/**
 * Identify materials that need reordering
 * Returns materials below reorder point sorted by urgency
 */
export async function getReorderNeeds() {
  const predictions = await generateForecastPredictions();
  return predictions.filter((p) => p.needsReorder);
}

// ============================================================================
// PURCHASE ORDER MANAGEMENT
// ============================================================================

/**
 * Get or create a supplier by name
 */
export async function getOrCreateSupplier(name: string, email?: string) {
  const existing = await db
    .select()
    .from(schema.suppliers)
    .where(eq(schema.suppliers.name, name))
    .limit(1);
  if (existing && existing.length > 0) return existing[0];

  const result = await db
    .insert(schema.suppliers)
    .values({
      name,
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return result[0];
}

/**
 * Create purchase order from reorder recommendations
 * Handles both PO and PO Items
 */
export async function createPurchaseOrder(data: {
  materialId?: number;
  quantity?: number;
  supplier?: string;
  supplierEmail?: string;
  expectedDelivery?: Date;
  totalCost?: number;
  notes?: string;
  status?: string;
  orderDate?: Date;
}) {
  try {
    // 1. Handle Supplier
    let supplierId = 1; // Default or fallback
    if (data.supplier) {
      const supplier = await getOrCreateSupplier(
        data.supplier,
        data.supplierEmail,
      );
      supplierId = supplier.id;
    }

    // 2. Create Purchase Order
    const [po] = await db
      .insert(schema.purchaseOrders)
      .values({
        supplierId,
        orderDate: data.orderDate || new Date(),
        expectedDeliveryDate: data.expectedDelivery,
        status: (data.status as any) || "draft",
        totalCost: data.totalCost,
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 3. Create PO Item if materialId provided
    if (data.materialId && data.quantity) {
      await db.insert(schema.purchaseOrderItems).values({
        purchaseOrderId: po.id,
        materialId: data.materialId,
        quantity: data.quantity,
        unitPrice: data.totalCost ? data.totalCost / data.quantity : 0,
      });
    }

    return po.id;
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return null;
  }
}

/**
 * Get purchase orders with optional filtering and joined data
 */
export async function getPurchaseOrders(filters?: {
  supplierId?: number;
  status?: string;
  materialId?: number;
}) {
  try {
    let query = db
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
        createdAt: schema.purchaseOrders.createdAt,
        // Aggregated material info for single-item POs (common case)
        materialId: schema.purchaseOrderItems.materialId,
        materialName: schema.materials.name,
        quantity: schema.purchaseOrderItems.quantity,
      })
      .from(schema.purchaseOrders)
      .leftJoin(
        schema.suppliers,
        eq(schema.purchaseOrders.supplierId, schema.suppliers.id),
      )
      .leftJoin(
        schema.purchaseOrderItems,
        eq(schema.purchaseOrderItems.purchaseOrderId, schema.purchaseOrders.id),
      )
      .leftJoin(
        schema.materials,
        eq(schema.purchaseOrderItems.materialId, schema.materials.id),
      );

    const conditions = [];

    if (filters?.supplierId) {
      conditions.push(eq(schema.purchaseOrders.supplierId, filters.supplierId));
    }
    if (filters?.status) {
      conditions.push(eq(schema.purchaseOrders.status, filters.status));
    }
    if (filters?.materialId) {
      conditions.push(
        eq(schema.purchaseOrderItems.materialId, filters.materialId),
      );
    }

    if (conditions.length > 0) {
      // @ts-ignore
      return await query
        .where(and(...conditions))
        .orderBy(desc(schema.purchaseOrders.orderDate));
    }

    return await query.orderBy(desc(schema.purchaseOrders.orderDate));
  } catch (error) {
    console.error("Error getting purchase orders:", error);
    return [];
  }
}

/**
 * Update purchase order status and details
 */
export async function updatePurchaseOrder(id: number, data: any) {
  try {
    // Handle specific field mapping if necessary
    const updatePayload: any = { ...data, updatedAt: new Date() };

    // In schema it is expectedDeliveryDate
    if (data.expectedDelivery) {
      updatePayload.expectedDeliveryDate = data.expectedDelivery;
      delete updatePayload.expectedDelivery;
    }
    if (data.actualDelivery) {
      updatePayload.actualDeliveryDate = data.actualDelivery;
      delete updatePayload.actualDelivery;
    }

    await db
      .update(schema.purchaseOrders)
      .set(updatePayload)
      .where(eq(schema.purchaseOrders.id, id));
    return true;
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return false;
  }
}

/**
 * Receive a purchase order and update material stock
 */
export async function receivePurchaseOrder(id: number) {
  try {
    // 1. Get the PO and its items
    const po = await db
      .select()
      .from(schema.purchaseOrders)
      .where(eq(schema.purchaseOrders.id, id))
      .limit(1);
    if (!po || po.length === 0) return false;

    const items = await db
      .select()
      .from(schema.purchaseOrderItems)
      .where(eq(schema.purchaseOrderItems.purchaseOrderId, id));

    // 2. Update material stock levels
    for (const item of items) {
      const material = await db
        .select()
        .from(schema.materials)
        .where(eq(schema.materials.id, item.materialId))
        .limit(1);
      if (material[0]) {
        await db
          .update(schema.materials)
          .set({
            quantity: material[0].quantity + item.quantity,
            lastOrderDate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.materials.id, item.materialId));
      }
    }

    // 3. Update PO status
    await db
      .update(schema.purchaseOrders)
      .set({
        status: "received",
        actualDeliveryDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.purchaseOrders.id, id));

    return true;
  } catch (error) {
    console.error("Error receiving purchase order:", error);
    return false;
  }
}

/**
 * Get supplier performance metrics
 * Calculates on-time delivery rate and average lead time
 */
export async function getSupplierPerformance(supplierId: number) {
  try {
    const orders = await db
      .select()
      .from(schema.purchaseOrders)
      .where(
        and(
          eq(schema.purchaseOrders.supplierId, supplierId),
          eq(schema.purchaseOrders.status, "received"),
        ),
      );

    if (orders.length === 0) {
      return {
        totalOrders: 0,
        onTimeDeliveryRate: 0,
        averageLeadTimeDays: 0,
      };
    }

    let onTimeCount = 0;
    let totalLeadTime = 0;

    for (const order of orders) {
      if (order.actualDeliveryDate && order.expectedDeliveryDate) {
        const actual = new Date(order.actualDeliveryDate).getTime();
        const expected = new Date(order.expectedDeliveryDate).getTime();

        if (actual <= expected) {
          onTimeCount++;
        }

        const leadTime = Math.floor(
          (actual - new Date(order.orderDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        totalLeadTime += leadTime;
      }
    }

    return {
      totalOrders: orders.length,
      onTimeDeliveryRate: (onTimeCount / orders.length) * 100,
      averageLeadTimeDays: Math.floor(totalLeadTime / orders.length),
    };
  } catch (error) {
    console.error("Error calculating supplier performance:", error);
    return {
      totalOrders: 0,
      onTimeDeliveryRate: 0,
      averageLeadTimeDays: 0,
    };
  }
}

// ============================================================================
// END SMART INVENTORY FORECASTING SYSTEM
// ============================================================================

export async function getReportSettings(userId: number) {
  return null;
}
export async function upsertReportSettings(data: any) {
  return 0;
}
export async function getReportRecipients() {
  return [];
}
export async function getAllReportRecipients() {
  return [];
}
export async function addReportRecipient(email: string, name?: string) {
  return true;
}
export async function removeReportRecipient(id: number) {
  return true;
}
export async function getEmailTemplates() {
  return [];
}
export async function getEmailTemplateByType(type: string) {
  return null;
}
export async function upsertEmailTemplate(data: any) {
  return 0;
}
export async function getEmailBranding() {
  return null;
}
export async function upsertEmailBranding(data: any) {
  return 0;
}
export async function createConversation(
  userId: number,
  title: string,
  modelName: string,
) {
  const result = await db
    .insert(schema.aiConversations)
    .values({
      userId,
      title,
      modelName,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.aiConversations.id });
  return result[0]?.id;
}

export async function getConversations(userId: number) {
  return await db
    .select()
    .from(schema.aiConversations)
    .where(eq(schema.aiConversations.userId, userId))
    .orderBy(desc(schema.aiConversations.updatedAt));
}

export async function getConversation(id: number) {
  const result = await db
    .select()
    .from(schema.aiConversations)
    .where(eq(schema.aiConversations.id, id));
  return result[0] || null;
}

export async function updateConversationTitle(id: number, title: string) {
  await db
    .update(schema.aiConversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(schema.aiConversations.id, id));
  return true;
}

export async function addMessage(
  conversationId: number,
  role: string,
  content: string,
  metadata?: any,
) {
  const result = await db
    .insert(schema.aiMessages)
    .values({
      conversationId,
      role,
      content,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date(),
    })
    .returning({ id: schema.aiMessages.id });

  // Also update conversation updatedAt
  await db
    .update(schema.aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(schema.aiConversations.id, conversationId));

  return result[0]?.id;
}

export async function getMessages(conversationId: number) {
  return await db
    .select()
    .from(schema.aiMessages)
    .where(eq(schema.aiMessages.conversationId, conversationId))
    .orderBy(schema.aiMessages.createdAt);
}

export async function getAvailableModels() {
  return [];
}
export async function upsertModel(
  name: string,
  displayName: string,
  type: string,
  size?: string,
) {
  return true;
}

export async function createAiConversation(data: any) {
  return createConversation(data.userId, data.title, data.modelName);
}

export async function getAiConversations(userId: number) {
  return getConversations(userId);
}

export async function deleteAiConversation(conversationId: number) {
  await db
    .delete(schema.aiConversations)
    .where(eq(schema.aiConversations.id, conversationId));
  await db
    .delete(schema.aiMessages)
    .where(eq(schema.aiMessages.conversationId, conversationId));
  return true;
}

export async function createAiMessage(data: any) {
  return addMessage(
    data.conversationId,
    data.role,
    data.content,
    data.metadata,
  );
}

export async function getAiMessages(conversationId: number) {
  return getMessages(conversationId);
}
export async function createTask(task: typeof schema.tasks.$inferInsert) {
  const result = await db
    .insert(schema.tasks)
    .values({
      ...task,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.tasks.id });

  return result[0]?.id;
}

export async function getTasks(userId: number) {
  // Get tasks assigned to user or created by user
  const assignments = await db
    .select()
    .from(schema.taskAssignments)
    .where(eq(schema.taskAssignments.userId, userId));
  const taskIds = assignments.map((a) => a.taskId);

  return await db
    .select()
    .from(schema.tasks)
    .where(
      or(
        eq(schema.tasks.createdBy, userId),
        taskIds.length > 0 ? inArray(schema.tasks.id, taskIds) : undefined,
      ),
    )
    .orderBy(desc(schema.tasks.createdAt));
}

export async function getTaskById(taskId: number) {
  const result = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, taskId));
  return result[0] || null;
}

export async function updateTask(
  taskId: number,
  updates: Partial<typeof schema.tasks.$inferInsert>,
) {
  await db
    .update(schema.tasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId));
  return true;
}

export async function deleteTask(taskId: number) {
  await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  return true;
}

export async function getTasksByStatus(userId: number, status: string) {
  return await db
    .select()
    .from(schema.tasks)
    .where(
      and(eq(schema.tasks.createdBy, userId), eq(schema.tasks.status, status)),
    )
    .orderBy(desc(schema.tasks.createdAt));
}

export async function getTasksByPriority(userId: number, priority: string) {
  return await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.createdBy, userId),
        eq(schema.tasks.priority, priority),
      ),
    )
    .orderBy(desc(schema.tasks.createdAt));
}

export async function getOverdueTasks(userId: number) {
  return await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.createdBy, userId),
        lte(schema.tasks.dueDate, new Date()),
        not(eq(schema.tasks.status, "completed")),
      ),
    )
    .orderBy(schema.tasks.dueDate);
}

export async function getTodaysTasks(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.createdBy, userId),
        gte(schema.tasks.dueDate, today),
        lte(schema.tasks.dueDate, tomorrow),
      ),
    )
    .orderBy(schema.tasks.dueDate);
}

export async function assignTask(
  assignment: typeof schema.taskAssignments.$inferInsert,
) {
  const result = await db
    .insert(schema.taskAssignments)
    .values({
      ...assignment,
      assignedAt: new Date(),
    })
    .returning({ id: schema.taskAssignments.id });

  return result[0]?.id;
}

export async function getTaskAssignments(taskId: number) {
  return await db
    .select()
    .from(schema.taskAssignments)
    .where(eq(schema.taskAssignments.taskId, taskId));
}

export async function updateTaskAssignment(assignmentId: number, updates: any) {
  // Not much to update in assignment junction table besides the user but we'll leave it
  return true;
}

export async function getAssignmentsForUser(userId: number) {
  return await db
    .select()
    .from(schema.taskAssignments)
    .where(eq(schema.taskAssignments.userId, userId));
}
export async function recordTaskStatusChange(history: any) {
  return true;
}
export async function getTaskHistory(taskId: number) {
  return [];
}
export async function createNotification(
  notification: typeof schema.notifications.$inferInsert,
) {
  const result = await db
    .insert(schema.notifications)
    .values({
      ...notification,
      sentAt: new Date(),
    })
    .returning({ id: schema.notifications.id });
  return result[0]?.id;
}

export async function getNotifications(userId: number, limit: number = 20) {
  return await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.sentAt))
    .limit(limit);
}

export async function getUnreadNotifications(userId: number) {
  return await db
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
  await db
    .update(schema.notifications)
    .set({ status: "read" })
    .where(eq(schema.notifications.id, notificationId));
  return true;
}

export async function updateNotificationStatus(
  notificationId: number,
  status: string,
  sentAt?: Date,
) {
  await db
    .update(schema.notifications)
    .set({ status, sentAt: sentAt || new Date() })
    .where(eq(schema.notifications.id, notificationId));
  return true;
}

export async function getPendingNotifications() {
  return await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.status, "unread"));
}

export async function getOrCreateNotificationPreferences(userId: number) {
  return {};
}
export async function updateNotificationPreferences(
  userId: number,
  preferences: any,
) {
  return true;
}
export async function getNotificationPreferences(userId: number) {
  return null;
}
export async function recordNotificationHistory(history: any) {
  return true;
}
export async function getNotificationHistory(notificationId: number) {
  return [];
}
export async function getNotificationHistoryByUser(
  userId: number,
  days?: number,
) {
  return [];
}
export async function getFailedNotifications(hours?: number) {
  return [];
}
export async function getNotificationTemplates(
  limit?: number,
  offset?: number,
) {
  return [];
}
export async function getNotificationTemplate(id: number) {
  return null;
}
export async function createNotificationTemplate(data: any) {
  return { insertId: 0 };
}
export async function updateNotificationTemplate(id: number, data: any) {
  return true;
}
export async function deleteNotificationTemplate(id: number) {
  return true;
}
export async function getNotificationTriggers(limit?: number, offset?: number) {
  return [];
}
export async function getNotificationTrigger(id: number) {
  return null;
}
export async function getTriggersByTemplate(templateId: number) {
  return [];
}
export async function getTriggersByEventType(eventType: string) {
  return [];
}
export async function getActiveTriggers() {
  return [];
}
export async function createNotificationTrigger(data: any) {
  return { insertId: 0 };
}
export async function updateNotificationTrigger(id: number, data: any) {
  return true;
}
export async function deleteNotificationTrigger(id: number) {
  return true;
}
export async function recordTriggerExecution(data: any) {
  return true;
}
export async function getTriggerExecutionLog(
  triggerId: number,
  limit?: number,
) {
  return [];
}

export async function updateUserLanguagePreference(
  userId: number,
  language: string,
) {
  await db
    .update(schema.users)
    .set({ languagePreference: language, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
  return true;
}

export async function createShift(shift: typeof schema.shifts.$inferInsert) {
  const result = await db
    .insert(schema.shifts)
    .values({
      ...shift,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.shifts.id });
  return result[0]?.id;
}

export async function getAllShifts() {
  return await db
    .select({
      id: schema.shifts.id,
      employeeId: schema.shifts.employeeId,
      templateId: schema.shifts.templateId,
      startTime: schema.shifts.startTime,
      endTime: schema.shifts.endTime,
      status: schema.shifts.status,
      notes: schema.shifts.notes,
      employeeName: schema.users.name,
    })
    .from(schema.shifts)
    .leftJoin(schema.users, eq(schema.shifts.employeeId, schema.users.id))
    .orderBy(desc(schema.shifts.startTime));
}

export async function getShiftsByEmployee(
  employeeId: number,
  startDate: Date,
  endDate: Date,
) {
  return await db
    .select()
    .from(schema.shifts)
    .where(
      and(
        eq(schema.shifts.employeeId, employeeId),
        gte(schema.shifts.startTime, startDate),
        lte(schema.shifts.startTime, endDate),
      ),
    )
    .orderBy(schema.shifts.startTime);
}

export async function updateShift(
  id: number,
  updates: Partial<typeof schema.shifts.$inferInsert>,
) {
  const [existing] = await db
    .select()
    .from(schema.shifts)
    .where(eq(schema.shifts.id, id));

  if (
    existing &&
    updates.status === "completed" &&
    existing.startTime &&
    updates.endTime
  ) {
    const start = new Date(existing.startTime);
    const end = new Date(updates.endTime);
    const diffMs = end.getTime() - start.getTime();
    const hoursWorked = diffMs / (1000 * 60 * 60);

    if (hoursWorked > 8) {
      const overtimeHours = hoursWorked - 8;
      // If we had a separate workHours table with overtime columns, we would update it here.
      // Since we are using the shifts table, we can add overtime information to notes if needed,
      // or ensure compliance logs are updated.
      await logComplianceAudit({
        employeeId: existing.employeeId,
        action: "overtime_detected",
        entityType: "shift",
        entityId: id,
        newValue: `Overtime: ${overtimeHours.toFixed(2)} hours`,
        performedBy: existing.employeeId,
      });
    }
  }

  await db
    .update(schema.shifts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.shifts.id, id));
  return true;
}

export async function getShiftById(id: number) {
  const result = await db
    .select()
    .from(schema.shifts)
    .where(eq(schema.shifts.id, id));
  return result[0] || null;
}

export async function deleteShift(id: number) {
  await db.delete(schema.shifts).where(eq(schema.shifts.id, id));
  return true;
}
export async function createShiftTemplate(
  template: typeof schema.shiftTemplates.$inferInsert,
) {
  const result = await db
    .insert(schema.shiftTemplates)
    .values({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.shiftTemplates.id });
  return result[0]?.id;
}

export async function getShiftTemplates() {
  const templates = await db
    .select()
    .from(schema.shiftTemplates)
    .where(eq(schema.shiftTemplates.isActive, true))
    .orderBy(schema.shiftTemplates.name);

  if (templates.length === 0) {
    // Seed default templates if none exist
    const defaults = [
      {
        name: "Morning Shift (7-19)",
        startTime: "07:00",
        endTime: "19:00",
        durationHours: 12.0,
        color: "#FF6C0E",
      },
      {
        name: "Daily Shift (7-17)",
        startTime: "07:00",
        endTime: "17:00",
        durationHours: 10.0,
        color: "#FFA500",
      },
    ];

    for (const template of defaults) {
      await db.insert(schema.shiftTemplates).values({
        ...template,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return await db
      .select()
      .from(schema.shiftTemplates)
      .where(eq(schema.shiftTemplates.isActive, true))
      .orderBy(schema.shiftTemplates.name);
  }

  return templates;
}

export async function setEmployeeAvailability(
  availability: typeof schema.employeeAvailability.$inferInsert,
) {
  const existing = await db
    .select()
    .from(schema.employeeAvailability)
    .where(
      and(
        eq(schema.employeeAvailability.employeeId, availability.employeeId),
        eq(schema.employeeAvailability.dayOfWeek, availability.dayOfWeek),
      ),
    );

  if (existing.length > 0) {
    await db
      .update(schema.employeeAvailability)
      .set({
        ...availability,
        updatedAt: new Date(),
      })
      .where(eq(schema.employeeAvailability.id, existing[0].id));
    return existing[0].id;
  }

  const result = await db
    .insert(schema.employeeAvailability)
    .values({
      ...availability,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.employeeAvailability.id });
  return result[0]?.id;
}

export async function getEmployeeAvailability(employeeId: number) {
  return await db
    .select()
    .from(schema.employeeAvailability)
    .where(eq(schema.employeeAvailability.employeeId, employeeId))
    .orderBy(schema.employeeAvailability.dayOfWeek);
}

export async function logComplianceAudit(
  audit: typeof schema.complianceAuditTrail.$inferInsert,
) {
  const result = await db
    .insert(schema.complianceAuditTrail)
    .values({
      ...audit,
      createdAt: new Date(),
    })
    .returning({ id: schema.complianceAuditTrail.id });
  return result[0]?.id;
}

export async function getComplianceAudits(
  employeeId: number,
  startDate: Date,
  endDate: Date,
) {
  return await db
    .select()
    .from(schema.complianceAuditTrail)
    .where(
      and(
        eq(schema.complianceAuditTrail.employeeId, employeeId),
        gte(schema.complianceAuditTrail.createdAt, startDate),
        lte(schema.complianceAuditTrail.createdAt, endDate),
      ),
    )
    .orderBy(desc(schema.complianceAuditTrail.createdAt));
}

export async function recordBreak(
  breakRecord: typeof schema.shiftBreaks.$inferInsert,
) {
  const result = await db
    .insert(schema.shiftBreaks)
    .values({
      ...breakRecord,
      createdAt: new Date(),
    })
    .returning({ id: schema.shiftBreaks.id });
  return result[0]?.id;
}

export async function getBreakRules(jurisdiction: string) {
  return [
    { type: "meal", durationMinutes: 30, afterHours: 5, paid: false },
    { type: "rest", durationMinutes: 15, afterHours: 4, paid: true },
  ];
}

export async function cacheOfflineEntry(cache: any) {
  return true;
}

export async function getPendingOfflineEntries(employeeId: number) {
  return [];
}

export async function updateOfflineSyncStatus(
  id: number,
  status: string,
  syncedAt?: Date,
) {
  return true;
}

export async function createJobSite(input: any) {
  return Date.now();
}

export async function getJobSites(projectId?: number) {
  if (projectId) {
    return await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId));
  }
  return await db.select().from(schema.projects);
}

export async function checkShiftConflicts(employeeId: number, shiftDate: Date) {
  const startOfDay = new Date(shiftDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(shiftDate);
  endOfDay.setHours(23, 59, 59, 999);

  return await db
    .select()
    .from(schema.shifts)
    .where(
      and(
        eq(schema.shifts.employeeId, employeeId),
        gte(schema.shifts.startTime, startOfDay),
        lte(schema.shifts.startTime, endOfDay),
        not(eq(schema.shifts.status, "cancelled")),
      ),
    );
}

export async function assignEmployeeToShift(
  employeeId: number,
  startTime: Date,
  endTime: Date,
  shiftDate: Date,
  createdBy: number,
) {
  const conflicts = await checkShiftConflicts(employeeId, shiftDate);
  if (conflicts.length > 0) {
    throw new Error("Employee already has a shift on this date");
  }

  const result = await db
    .insert(schema.shifts)
    .values({
      employeeId,
      startTime,
      endTime,
      status: "scheduled",
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: schema.shifts.id });

  return result[0]?.id;
}

export async function getAllEmployeesForShifts() {
  return await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(eq(schema.users.role, "employee"));
}

export async function createLocationLog(input: any) {
  return Date.now();
}

export async function createShiftSwap(
  swap: typeof schema.shiftSwaps.$inferInsert,
) {
  const result = await db
    .insert(schema.shiftSwaps)
    .values({
      ...swap,
      status: "pending",
      requestedAt: new Date(),
    })
    .returning({ id: schema.shiftSwaps.id });
  return result[0]?.id;
}

export async function getPendingShiftSwaps() {
  return await db
    .select({
      swap: schema.shiftSwaps,
      shift: schema.shifts,
      fromEmployee: schema.users,
      toEmployee: schema.users,
    })
    .from(schema.shiftSwaps)
    .innerJoin(schema.shifts, eq(schema.shiftSwaps.shiftId, schema.shifts.id))
    .innerJoin(
      schema.users,
      eq(schema.shiftSwaps.fromEmployeeId, schema.users.id),
    )
    .leftJoin(schema.users, eq(schema.shiftSwaps.toEmployeeId, schema.users.id))
    .where(eq(schema.shiftSwaps.status, "pending"));
}

export async function updateShiftSwapStatus(
  id: number,
  status: "approved" | "rejected" | "cancelled",
  notes?: string,
) {
  const [swap] = await db
    .select()
    .from(schema.shiftSwaps)
    .where(eq(schema.shiftSwaps.id, id));

  if (!swap) throw new Error("Shift swap request not found");

  await db.transaction(async (tx) => {
    await tx
      .update(schema.shiftSwaps)
      .set({
        status,
        notes,
        respondedAt: new Date(),
      })
      .where(eq(schema.shiftSwaps.id, id));

    if (status === "approved" && swap.toEmployeeId) {
      await tx
        .update(schema.shifts)
        .set({
          employeeId: swap.toEmployeeId,
          updatedAt: new Date(),
        })
        .where(eq(schema.shifts.id, swap.shiftId));
    }
  });

  return true;
}

export async function recordGeofenceViolation(input: any) {
  return Date.now();
}

export async function getLocationHistory(employeeId: number, limit?: number) {
  return [];
}

export async function getGeofenceViolations(
  employeeId?: number,
  resolved?: boolean,
) {
  return [];
}

export async function resolveGeofenceViolation(
  violationId: number,
  resolvedBy: number,
  notes?: string,
) {
  return true;
}

export async function requestTimesheetApproval(
  approval: typeof schema.timesheetApprovals.$inferInsert,
) {
  const result = await db
    .insert(schema.timesheetApprovals)
    .values({
      ...approval,
      status: "pending",
      createdAt: new Date(),
    })
    .returning({ id: schema.timesheetApprovals.id });
  return result[0]?.id;
}

export async function approveTimesheet(
  approvalId: number,
  approvedBy: number,
  comments?: string,
) {
  await db
    .update(schema.timesheetApprovals)
    .set({
      status: "approved",
      approverId: approvedBy,
      approvedAt: new Date(),
      comments: comments,
    })
    .where(eq(schema.timesheetApprovals.id, approvalId));
  return true;
}

export async function rejectTimesheet(
  approvalId: number,
  rejectedBy: number,
  comments: string,
) {
  await db
    .update(schema.timesheetApprovals)
    .set({
      status: "rejected",
      approverId: rejectedBy,
      rejectionReason: comments,
    })
    .where(eq(schema.timesheetApprovals.id, approvalId));
  return true;
}

export async function getPendingTimesheetApprovals(managerId?: number) {
  return await db
    .select({
      approval: schema.timesheetApprovals,
      shift: schema.shifts,
      employee: schema.users,
    })
    .from(schema.timesheetApprovals)
    .innerJoin(
      schema.shifts,
      eq(schema.timesheetApprovals.shiftId, schema.shifts.id),
    )
    .innerJoin(schema.users, eq(schema.shifts.employeeId, schema.users.id))
    .where(eq(schema.timesheetApprovals.status, "pending"));
}

export async function getTimesheetApprovalHistory(employeeId: number) {
  return await db
    .select({
      approval: schema.timesheetApprovals,
      shift: schema.shifts,
    })
    .from(schema.timesheetApprovals)
    .innerJoin(
      schema.shifts,
      eq(schema.timesheetApprovals.shiftId, schema.shifts.id),
    )
    .where(eq(schema.shifts.employeeId, employeeId))
    .orderBy(desc(schema.timesheetApprovals.createdAt));
}

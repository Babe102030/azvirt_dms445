import { ENV } from './_core/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema';
import { eq, and, gte, lte, desc, like, sql as drizzleSql, or, inArray, not } from 'drizzle-orm';

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

  const role = user.role || (user.openId === ENV.ownerOpenId ? 'admin' : 'user');

  await db.insert(schema.users).values({
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    role: role,
    phoneNumber: user.phoneNumber,
    smsNotificationsEnabled: user.smsNotificationsEnabled ?? false,
    languagePreference: user.languagePreference ?? 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  }).onConflictDoUpdate({
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
  const result = await db.select().from(schema.users).where(eq(schema.users.openId, openId));
  return result[0] || null;
}

export async function createProject(project: InsertProject) {
  const result = await db.insert(schema.projects).values({
    name: project.name,
    description: project.description,
    location: project.location,
    status: project.status || 'planning',
    startDate: project.startDate,
    endDate: project.endDate,
    createdBy: project.createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.projects.id });

  return result[0]?.id;
}

export async function getProjects() {
  return await db.select().from(schema.projects).orderBy(desc(schema.projects.createdAt));
}

export async function getProjectById(id: number) {
  const result = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
  return result[0] || null;
}

export async function updateProject(id: number, updates: Partial<InsertProject>) {
  const updateData: any = { updatedAt: new Date() };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
  if (updates.endDate !== undefined) updateData.endDate = updates.endDate;

  await db.update(schema.projects).set(updateData).where(eq(schema.projects.id, id));
  return true;
}

export async function createMaterial(material: InsertMaterial) {
  const result = await db.insert(schema.materials).values({
    name: material.name,
    category: material.category || 'other',
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
  }).returning({ id: schema.materials.id });

  return result[0]?.id;
}

export async function getMaterials() {
  return await db.select().from(schema.materials).orderBy(schema.materials.name);
}

export async function updateMaterial(id: number, updates: Partial<InsertMaterial>) {
  const updateData: any = { updatedAt: new Date() };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.unit !== undefined) updateData.unit = updates.unit;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.minStock !== undefined) updateData.minStock = updates.minStock;
  if (updates.criticalThreshold !== undefined) updateData.criticalThreshold = updates.criticalThreshold;
  if (updates.supplier !== undefined) updateData.supplier = updates.supplier;
  if (updates.unitPrice !== undefined) updateData.unitPrice = updates.unitPrice;
  if (updates.lowStockEmailSent !== undefined) updateData.lowStockEmailSent = updates.lowStockEmailSent;
  if (updates.supplierEmail !== undefined) updateData.supplierEmail = updates.supplierEmail;

  await db.update(schema.materials).set(updateData).where(eq(schema.materials.id, id));
  return true;
}

export async function deleteMaterial(id: number) {
  await db.delete(schema.materials).where(eq(schema.materials.id, id));
  return true;
}

// STUB IMPLEMENTATIONS - TODO: Implement with proper Drizzle queries
// These functions return placeholder values to keep the app running
export async function createDocument(doc: typeof schema.documents.$inferInsert) {
  const result = await db.insert(schema.documents).values({
    ...doc,
    createdAt: new Date(),
  }).returning({ id: schema.documents.id });

  return result[0];
}

export async function getDocuments(filters?: { projectId?: number; type?: string }) {
  let query = db.select().from(schema.documents);
  const conditions = [];
  if (filters?.projectId) conditions.push(eq(schema.documents.projectId, filters.projectId));
  if (filters?.type) conditions.push(eq(schema.documents.type, filters.type));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query.where(and(...conditions)).orderBy(desc(schema.documents.createdAt));
  }
  return await query.orderBy(desc(schema.documents.createdAt));
}

export async function getDocumentById(id: number) {
  const result = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
  return result[0] || null;
}

export async function deleteDocument(id: number) {
  await db.delete(schema.documents).where(eq(schema.documents.id, id));
  return true;
}

// Add stub implementations for all remaining functions to prevent runtime errors
export async function createDelivery(delivery: typeof schema.deliveries.$inferInsert): Promise<number> {
  const result = await db.insert(schema.deliveries).values({
    ...delivery,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.deliveries.id });

  return result[0]?.id;
}

export async function getDeliveries(filters?: { projectId?: number; status?: string }) {
  let query = db.select().from(schema.deliveries);

  const conditions = [];
  if (filters?.projectId) conditions.push(eq(schema.deliveries.projectId, filters.projectId));
  if (filters?.status) conditions.push(eq(schema.deliveries.status, filters.status));

  if (conditions.length > 0) {
    // @ts-ignore - drizzle type complexity
    return await query.where(and(...conditions)).orderBy(desc(schema.deliveries.scheduledTime));
  }

  return await query.orderBy(desc(schema.deliveries.scheduledTime));
}

export async function updateDelivery(id: number, data: Partial<typeof schema.deliveries.$inferInsert>) {
  await db.update(schema.deliveries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.deliveries.id, id));
  return true;
}

export async function createQualityTest(test: typeof schema.qualityTests.$inferInsert) {
  const result = await db.insert(schema.qualityTests).values({
    ...test,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.qualityTests.id });

  return result[0]?.id;
}

export async function getQualityTests(filters?: { deliveryId?: number; projectId?: number; status?: string }) {
  let query = db.select().from(schema.qualityTests);

  const conditions = [];
  if (filters?.deliveryId) conditions.push(eq(schema.qualityTests.deliveryId, filters.deliveryId));
  if (filters?.projectId) conditions.push(eq(schema.qualityTests.projectId, filters.projectId));
  if (filters?.status) conditions.push(eq(schema.qualityTests.status, filters.status));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query.where(and(...conditions)).orderBy(desc(schema.qualityTests.testedAt));
  }

  return await query.orderBy(desc(schema.qualityTests.testedAt));
}

export async function updateQualityTest(id: number, data: Partial<typeof schema.qualityTests.$inferInsert>) {
  await db.update(schema.qualityTests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.qualityTests.id, id));
  return true;
}

export async function getFailedQualityTests(days: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return await db.select()
    .from(schema.qualityTests)
    .where(and(eq(schema.qualityTests.status, 'fail'), gte(schema.qualityTests.testedAt, cutoff)))
    .orderBy(desc(schema.qualityTests.testedAt));
}

export async function getQualityTestTrends(days: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const tests = await db.select().from(schema.qualityTests).where(gte(schema.qualityTests.testedAt, cutoff));

  const totalTests = tests.length;
  if (totalTests === 0) return { passRate: 0, failRate: 0, pendingRate: 0, totalTests: 0, byType: [] };

  const passed = tests.filter(t => t.status === 'pass').length;
  const failed = tests.filter(t => t.status === 'fail').length;
  const pending = tests.filter(t => t.status === 'pending').length;

  return {
    passRate: (passed / totalTests) * 100,
    failRate: (failed / totalTests) * 100,
    pendingRate: (pending / totalTests) * 100,
    totalTests,
    byType: [] // Could aggregate further if needed
  };
}
export async function createEmployee(employee: typeof schema.employees.$inferInsert) {
  const result = await db.insert(schema.employees).values({
    ...employee,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.employees.id });

  return result[0]?.id;
}

export async function getEmployees(filters?: { department?: string; active?: boolean }) {
  let query = db.select().from(schema.employees);
  const conditions = [];
  if (filters?.department) conditions.push(eq(schema.employees.department, filters.department));
  if (filters?.active !== undefined) conditions.push(eq(schema.employees.active, filters.active));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query.where(and(...conditions)).orderBy(schema.employees.lastName);
  }
  return await query.orderBy(schema.employees.lastName);
}

export async function getEmployeeById(id: number) {
  const result = await db.select().from(schema.employees).where(eq(schema.employees.id, id));
  return result[0] || null;
}

export async function updateEmployee(id: number, data: Partial<typeof schema.employees.$inferInsert>) {
  await db.update(schema.employees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.employees.id, id));
  return true;
}

export async function deleteEmployee(id: number) {
  await db.update(schema.employees).set({ active: false }).where(eq(schema.employees.id, id));
  return true;
}

export async function createWorkHour(shift: typeof schema.shifts.$inferInsert) {
  const result = await db.insert(schema.shifts).values({
    ...shift,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.shifts.id });

  return result[0]?.id;
}

export async function getWorkHours(filters?: { employeeId?: number; status?: string }) {
  let query = db.select().from(schema.shifts);
  const conditions = [];
  if (filters?.employeeId) conditions.push(eq(schema.shifts.employeeId, filters.employeeId));
  if (filters?.status) conditions.push(eq(schema.shifts.status, filters.status));

  if (conditions.length > 0) {
    // @ts-ignore
    return await query.where(and(...conditions)).orderBy(desc(schema.shifts.startTime));
  }
  return await query.orderBy(desc(schema.shifts.startTime));
}

export async function updateWorkHour(id: number, data: Partial<typeof schema.shifts.$inferInsert>) {
  await db.update(schema.shifts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.shifts.id, id));
  return true;
}
export async function createConcreteBase(base: any) { return Date.now(); }
export async function getConcreteBases() { return []; }
export async function getConcreteBaseById(id: number) { return null; }
export async function updateConcreteBase(id: number, data: any) { return true; }
export async function createMachine(machine: typeof schema.machines.$inferInsert) {
  const result = await db.insert(schema.machines).values({
    ...machine,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.machines.id });

  return result[0]?.id;
}

export async function getMachines(filters?: { status?: string }) {
  let query = db.select().from(schema.machines);
  if (filters?.status) {
    return await query.where(eq(schema.machines.status, filters.status)).orderBy(schema.machines.name);
  }
  return await query.orderBy(schema.machines.name);
}

export async function getMachineById(id: number) {
  const result = await db.select().from(schema.machines).where(eq(schema.machines.id, id));
  return result[0] || null;
}

export async function updateMachine(id: number, data: Partial<typeof schema.machines.$inferInsert>) {
  await db.update(schema.machines)
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

export async function getMachineMaintenance(filters?: any) { return []; }

export async function createMachineWorkHour(workHour: typeof schema.machineWorkHours.$inferInsert) {
  const result = await db.insert(schema.machineWorkHours).values(workHour).returning({ id: schema.machineWorkHours.id });
  return result[0]?.id;
}

export async function getMachineWorkHours(filters?: { machineId?: number }) {
  let query = db.select().from(schema.machineWorkHours);
  if (filters?.machineId) {
    return await query.where(eq(schema.machineWorkHours.machineId, filters.machineId)).orderBy(desc(schema.machineWorkHours.date));
  }
  return await query.orderBy(desc(schema.machineWorkHours.date));
}
export async function createAggregateInput(input: any) { return Date.now(); }
export async function getAggregateInputs(filters?: any) { return []; }
export async function getWeeklyTimesheetSummary(employeeId?: number, weekStart?: Date) { return []; }
export async function getMonthlyTimesheetSummary(employeeId?: number, year?: number, month?: number) { return []; }
export async function getLowStockMaterials() { return []; }
export async function getCriticalStockMaterials() { return []; }
export async function getAdminUsersWithSMS() { return []; }
export async function updateUserSMSSettings(userId: number, phoneNumber: string, enabled: boolean) { return true; }
export async function recordConsumption(consumption: any) { return true; }
export async function getConsumptionHistory(materialId?: number, days?: number) { return []; }
export async function calculateDailyConsumptionRate(materialId: number, days?: number) { return 0; }
export async function generateForecastPredictions() { return []; }
export async function getForecastPredictions() { return []; }
export async function createPurchaseOrder(order: any) { return Date.now(); }
export async function getPurchaseOrders(filters?: any) { return []; }
export async function updatePurchaseOrder(id: number, data: any) { return true; }
export async function getReportSettings(userId: number) { return null; }
export async function upsertReportSettings(data: any) { return 0; }
export async function getReportRecipients() { return []; }
export async function getAllReportRecipients() { return []; }
export async function addReportRecipient(email: string, name?: string) { return true; }
export async function removeReportRecipient(id: number) { return true; }
export async function getEmailTemplates() { return []; }
export async function getEmailTemplateByType(type: string) { return null; }
export async function upsertEmailTemplate(data: any) { return 0; }
export async function getEmailBranding() { return null; }
export async function upsertEmailBranding(data: any) { return 0; }
export async function createConversation(userId: number, title: string, modelName: string) {
  const result = await db.insert(schema.aiConversations).values({
    userId,
    title,
    modelName,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.aiConversations.id });
  return result[0]?.id;
}

export async function getConversations(userId: number) {
  return await db.select().from(schema.aiConversations).where(eq(schema.aiConversations.userId, userId)).orderBy(desc(schema.aiConversations.updatedAt));
}

export async function getConversation(id: number) {
  const result = await db.select().from(schema.aiConversations).where(eq(schema.aiConversations.id, id));
  return result[0] || null;
}

export async function updateConversationTitle(id: number, title: string) {
  await db.update(schema.aiConversations).set({ title, updatedAt: new Date() }).where(eq(schema.aiConversations.id, id));
  return true;
}

export async function addMessage(conversationId: number, role: string, content: string, metadata?: any) {
  const result = await db.insert(schema.aiMessages).values({
    conversationId,
    role,
    content,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: new Date(),
  }).returning({ id: schema.aiMessages.id });

  // Also update conversation updatedAt
  await db.update(schema.aiConversations).set({ updatedAt: new Date() }).where(eq(schema.aiConversations.id, conversationId));

  return result[0]?.id;
}

export async function getMessages(conversationId: number) {
  return await db.select().from(schema.aiMessages).where(eq(schema.aiMessages.conversationId, conversationId)).orderBy(schema.aiMessages.createdAt);
}

export async function getAvailableModels() { return []; }
export async function upsertModel(name: string, displayName: string, type: string, size?: string) { return true; }

export async function createAiConversation(data: any) {
  return createConversation(data.userId, data.title, data.modelName);
}

export async function getAiConversations(userId: number) {
  return getConversations(userId);
}

export async function deleteAiConversation(conversationId: number) {
  await db.delete(schema.aiConversations).where(eq(schema.aiConversations.id, conversationId));
  await db.delete(schema.aiMessages).where(eq(schema.aiMessages.conversationId, conversationId));
  return true;
}

export async function createAiMessage(data: any) {
  return addMessage(data.conversationId, data.role, data.content, data.metadata);
}

export async function getAiMessages(conversationId: number) {
  return getMessages(conversationId);
}
export async function createTask(task: typeof schema.tasks.$inferInsert) {
  const result = await db.insert(schema.tasks).values({
    ...task,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.tasks.id });

  return result[0]?.id;
}

export async function getTasks(userId: number) {
  // Get tasks assigned to user or created by user
  const assignments = await db.select().from(schema.taskAssignments).where(eq(schema.taskAssignments.userId, userId));
  const taskIds = assignments.map(a => a.taskId);

  return await db.select().from(schema.tasks)
    .where(or(
      eq(schema.tasks.createdBy, userId),
      taskIds.length > 0 ? inArray(schema.tasks.id, taskIds) : undefined
    ))
    .orderBy(desc(schema.tasks.createdAt));
}

export async function getTaskById(taskId: number) {
  const result = await db.select().from(schema.tasks).where(eq(schema.tasks.id, taskId));
  return result[0] || null;
}

export async function updateTask(taskId: number, updates: Partial<typeof schema.tasks.$inferInsert>) {
  await db.update(schema.tasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.tasks.id, taskId));
  return true;
}

export async function deleteTask(taskId: number) {
  await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
  return true;
}

export async function getTasksByStatus(userId: number, status: string) {
  return await db.select().from(schema.tasks)
    .where(and(eq(schema.tasks.createdBy, userId), eq(schema.tasks.status, status)))
    .orderBy(desc(schema.tasks.createdAt));
}

export async function getTasksByPriority(userId: number, priority: string) {
  return await db.select().from(schema.tasks)
    .where(and(eq(schema.tasks.createdBy, userId), eq(schema.tasks.priority, priority)))
    .orderBy(desc(schema.tasks.createdAt));
}

export async function getOverdueTasks(userId: number) {
  return await db.select().from(schema.tasks)
    .where(and(
      eq(schema.tasks.createdBy, userId),
      lte(schema.tasks.dueDate, new Date()),
      not(eq(schema.tasks.status, 'completed'))
    ))
    .orderBy(schema.tasks.dueDate);
}

export async function getTodaysTasks(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db.select().from(schema.tasks)
    .where(and(
      eq(schema.tasks.createdBy, userId),
      gte(schema.tasks.dueDate, today),
      lte(schema.tasks.dueDate, tomorrow)
    ))
    .orderBy(schema.tasks.dueDate);
}

export async function assignTask(assignment: typeof schema.taskAssignments.$inferInsert) {
  const result = await db.insert(schema.taskAssignments).values({
    ...assignment,
    assignedAt: new Date(),
  }).returning({ id: schema.taskAssignments.id });

  return result[0]?.id;
}

export async function getTaskAssignments(taskId: number) {
  return await db.select().from(schema.taskAssignments).where(eq(schema.taskAssignments.taskId, taskId));
}

export async function updateTaskAssignment(assignmentId: number, updates: any) {
  // Not much to update in assignment junction table besides the user but we'll leave it
  return true;
}

export async function getAssignmentsForUser(userId: number) {
  return await db.select().from(schema.taskAssignments).where(eq(schema.taskAssignments.userId, userId));
}
export async function recordTaskStatusChange(history: any) { return true; }
export async function getTaskHistory(taskId: number) { return []; }
export async function createNotification(notification: typeof schema.notifications.$inferInsert) {
  const result = await db.insert(schema.notifications).values({
    ...notification,
    sentAt: new Date(),
  }).returning({ id: schema.notifications.id });
  return result[0]?.id;
}

export async function getNotifications(userId: number, limit: number = 20) {
  return await db.select().from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.sentAt))
    .limit(limit);
}

export async function getUnreadNotifications(userId: number) {
  return await db.select().from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), eq(schema.notifications.status, 'unread')))
    .orderBy(desc(schema.notifications.sentAt));
}

export async function markNotificationAsRead(notificationId: number) {
  await db.update(schema.notifications).set({ status: 'read' }).where(eq(schema.notifications.id, notificationId));
  return true;
}

export async function updateNotificationStatus(notificationId: number, status: string, sentAt?: Date) {
  await db.update(schema.notifications).set({ status, sentAt: sentAt || new Date() }).where(eq(schema.notifications.id, notificationId));
  return true;
}

export async function getPendingNotifications() {
  return await db.select().from(schema.notifications).where(eq(schema.notifications.status, 'unread'));
}

export async function getOrCreateNotificationPreferences(userId: number) { return {}; }
export async function updateNotificationPreferences(userId: number, preferences: any) { return true; }
export async function getNotificationPreferences(userId: number) { return null; }
export async function recordNotificationHistory(history: any) { return true; }
export async function getNotificationHistory(notificationId: number) { return []; }
export async function getNotificationHistoryByUser(userId: number, days?: number) { return []; }
export async function getFailedNotifications(hours?: number) { return []; }
export async function getNotificationTemplates(limit?: number, offset?: number) { return []; }
export async function getNotificationTemplate(id: number) { return null; }
export async function createNotificationTemplate(data: any) { return { insertId: 0 }; }
export async function updateNotificationTemplate(id: number, data: any) { return true; }
export async function deleteNotificationTemplate(id: number) { return true; }
export async function getNotificationTriggers(limit?: number, offset?: number) { return []; }
export async function getNotificationTrigger(id: number) { return null; }
export async function getTriggersByTemplate(templateId: number) { return []; }
export async function getTriggersByEventType(eventType: string) { return []; }
export async function getActiveTriggers() { return []; }
export async function createNotificationTrigger(data: any) { return { insertId: 0 }; }
export async function updateNotificationTrigger(id: number, data: any) { return true; }
export async function deleteNotificationTrigger(id: number) { return true; }
export async function recordTriggerExecution(data: any) { return true; }
export async function getTriggerExecutionLog(triggerId: number, limit?: number) { return []; }

export async function updateUserLanguagePreference(userId: number, language: string) {
  await db.update(schema.users).set({ languagePreference: language, updatedAt: new Date() }).where(eq(schema.users.id, userId));
  return true;
}

export async function createShift(shift: typeof schema.shifts.$inferInsert) {
  const result = await db.insert(schema.shifts).values({
    ...shift,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning({ id: schema.shifts.id });
  return result[0]?.id;
}

export async function getAllShifts() {
  return await db.select().from(schema.shifts).orderBy(desc(schema.shifts.startTime));
}

export async function getShiftsByEmployee(employeeId: number, startDate: Date, endDate: Date) {
  return await db.select().from(schema.shifts)
    .where(and(
      eq(schema.shifts.employeeId, employeeId),
      gte(schema.shifts.startTime, startDate),
      lte(schema.shifts.startTime, endDate)
    ))
    .orderBy(schema.shifts.startTime);
}

export async function updateShift(id: number, updates: Partial<typeof schema.shifts.$inferInsert>) {
  await db.update(schema.shifts).set({ ...updates, updatedAt: new Date() }).where(eq(schema.shifts.id, id));
  return true;
}

export async function getShiftById(id: number) {
  const result = await db.select().from(schema.shifts).where(eq(schema.shifts.id, id));
  return result[0] || null;
}

export async function deleteShift(id: number) {
  await db.delete(schema.shifts).where(eq(schema.shifts.id, id));
  return true;
}
export async function createShiftTemplate(template: any) { return Date.now(); }
export async function getShiftTemplates() { return []; }
export async function setEmployeeAvailability(availability: any) { return true; }
export async function getEmployeeAvailability(employeeId: number) { return []; }
export async function logComplianceAudit(audit: any) { return true; }
export async function getComplianceAudits(employeeId: number, startDate: Date, endDate: Date) { return []; }
export async function recordBreak(breakRecord: any) { return true; }
export async function getBreakRules(jurisdiction: string) { return []; }
export async function cacheOfflineEntry(cache: any) { return true; }
export async function getPendingOfflineEntries(employeeId: number) { return []; }
export async function updateOfflineSyncStatus(id: number, status: string, syncedAt?: Date) { return true; }
export async function createJobSite(input: any) { return Date.now(); }
export async function getJobSites(projectId?: number) { return []; }
export async function createLocationLog(input: any) { return Date.now(); }
export async function recordGeofenceViolation(input: any) { return Date.now(); }
export async function getLocationHistory(employeeId: number, limit?: number) { return []; }
export async function getGeofenceViolations(employeeId?: number, resolved?: boolean) { return []; }
export async function resolveGeofenceViolation(violationId: number, resolvedBy: number, notes?: string) { return true; }
export async function requestTimesheetApproval(approval: any) { return Date.now(); }
export async function approveTimesheet(approvalId: number, approvedBy: number, comments?: string) { return true; }
export async function rejectTimesheet(approvalId: number, rejectedBy: number, comments: string) { return true; }
export async function getPendingTimesheetApprovals(managerId?: number) { return []; }
export async function getTimesheetApprovalHistory(employeeId: number) { return []; }

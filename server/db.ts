import { ENV } from './_core/env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema';
import { eq, and, gte, lte, desc, like, sql } from 'drizzle-orm';

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
export async function createDocument(doc: any) { return { id: Date.now() }; }
export async function getDocuments(filters?: any) { return []; }
export async function getDocumentById(id: number) { return null; }
export async function deleteDocument(id: number) { return true; }

// Add stub implementations for all remaining functions to prevent runtime errors
export async function createDelivery(delivery: any) { return Date.now(); }
export async function getDeliveries(filters?: any) { return []; }
export async function updateDelivery(id: number, data: any) { return true; }
export async function createQualityTest(test: any) { return Date.now(); }
export async function getQualityTests(filters?: any) { return []; }
export async function updateQualityTest(id: number, data: any) { return true; }
export async function getFailedQualityTests(days?: number) { return []; }
export async function getQualityTestTrends(days?: number) { return { passRate: 0, failRate: 0, pendingRate: 0, totalTests: 0, byType: [] }; }
export async function createEmployee(employee: any) { return Date.now(); }
export async function getEmployees(filters?: any) { return []; }
export async function getEmployeeById(id: number) { return null; }
export async function updateEmployee(id: number, data: any) { return true; }
export async function deleteEmployee(id: number) { return true; }
export async function createWorkHour(workHour: any) { return Date.now(); }
export async function getWorkHours(filters?: any) { return []; }
export async function updateWorkHour(id: number, data: any) { return true; }
export async function createConcreteBase(base: any) { return Date.now(); }
export async function getConcreteBases() { return []; }
export async function getConcreteBaseById(id: number) { return null; }
export async function updateConcreteBase(id: number, data: any) { return true; }
export async function createMachine(machine: any) { return Date.now(); }
export async function getMachines(filters?: any) { return []; }
export async function getMachineById(id: number) { return null; }
export async function updateMachine(id: number, data: any) { return true; }
export async function deleteMachine(id: number) { return true; }
export async function createMachineMaintenance(maintenance: any) { return Date.now(); }
export async function getMachineMaintenance(filters?: any) { return []; }
export async function createMachineWorkHour(workHour: any) { return Date.now(); }
export async function getMachineWorkHours(filters?: any) { return []; }
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
export async function createConversation(userId: number, title: string, modelName: string) { return Date.now(); }
export async function getConversations(userId: number) { return []; }
export async function getConversation(id: number) { return null; }
export async function updateConversationTitle(id: number, title: string) { return true; }
export async function addMessage(conversationId: number, role: string, content: string, metadata?: any) { return Date.now(); }
export async function getMessages(conversationId: number) { return []; }
export async function getAvailableModels() { return []; }
export async function upsertModel(name: string, displayName: string, type: string, size?: string) { return true; }
export async function createAiConversation(data: any) { return Date.now(); }
export async function getAiConversations(userId: number) { return []; }
export async function deleteAiConversation(conversationId: number) { return true; }
export async function createAiMessage(data: any) { return Date.now(); }
export async function getAiMessages(conversationId: number) { return []; }
export async function createTask(task: any) { return Date.now(); }
export async function getTasks(userId: number) { return []; }
export async function getTaskById(taskId: number) { return null; }
export async function updateTask(taskId: number, updates: any) { return true; }
export async function deleteTask(taskId: number) { return true; }
export async function getTasksByStatus(userId: number, status: string) { return []; }
export async function getTasksByPriority(userId: number, priority: string) { return []; }
export async function getOverdueTasks(userId: number) { return []; }
export async function getTodaysTasks(userId: number) { return []; }
export async function assignTask(assignment: any) { return Date.now(); }
export async function getTaskAssignments(taskId: number) { return []; }
export async function updateTaskAssignment(assignmentId: number, updates: any) { return true; }
export async function getAssignmentsForUser(userId: number) { return []; }
export async function recordTaskStatusChange(history: any) { return true; }
export async function getTaskHistory(taskId: number) { return []; }
export async function createNotification(notification: any) { return Date.now(); }
export async function getNotifications(userId: number, limit?: number) { return []; }
export async function getUnreadNotifications(userId: number) { return []; }
export async function markNotificationAsRead(notificationId: number) { return true; }
export async function updateNotificationStatus(notificationId: number, status: string, sentAt?: Date) { return true; }
export async function getPendingNotifications() { return []; }
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
export async function updateUserLanguagePreference(userId: number, language: string) { return true; }
export async function createShift(shift: any) { return Date.now(); }
export async function getAllShifts() { return []; }
export async function getShiftsByEmployee(employeeId: number, startDate: Date, endDate: Date) { return []; }
export async function updateShift(id: number, updates: any) { return true; }
export async function getShiftById(id: number) { return null; }
export async function deleteShift(id: number) { return true; }
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

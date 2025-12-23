import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  smsNotificationsEnabled: boolean("smsNotificationsEnabled").default(false).notNull(),
  languagePreference: varchar("languagePreference", { length: 10 }).default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table for construction projects
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 500 }),
  status: mysqlEnum("status", ["planning", "active", "completed", "on_hold"]).default("planning").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Documents table for file management
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  category: mysqlEnum("category", ["contract", "blueprint", "report", "certificate", "invoice", "other"]).default("other").notNull(),
  projectId: int("projectId"),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Materials table for inventory management
 */
export const materials = mysqlTable("materials", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["cement", "aggregate", "admixture", "water", "other"]).default("other").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  quantity: int("quantity").notNull().default(0),
  minStock: int("minStock").notNull().default(0),
  criticalThreshold: int("criticalThreshold").notNull().default(0),
  supplier: varchar("supplier", { length: 255 }),
  unitPrice: int("unitPrice"),
  lowStockEmailSent: boolean("lowStockEmailSent").default(false),
  lastEmailSentAt: timestamp("lastEmailSentAt"),
  supplierEmail: varchar("supplierEmail", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

/**
 * Deliveries table for concrete delivery tracking
 */
export const deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId"),
  projectName: varchar("projectName", { length: 255 }).notNull(),
  concreteType: varchar("concreteType", { length: 100 }).notNull(),
  volume: int("volume").notNull(),
  scheduledTime: timestamp("scheduledTime").notNull(),
  actualTime: timestamp("actualTime"),
  status: mysqlEnum("status", ["scheduled", "loaded", "en_route", "arrived", "delivered", "returning", "completed", "cancelled"]).default("scheduled").notNull(),
  driverName: varchar("driverName", { length: 255 }),
  vehicleNumber: varchar("vehicleNumber", { length: 100 }),
  notes: text("notes"),
  gpsLocation: varchar("gpsLocation", { length: 100 }), // "lat,lng"
  deliveryPhotos: text("deliveryPhotos"), // JSON array of photo URLs
  estimatedArrival: int("estimatedArrival"), // Unix timestamp (seconds)
  actualArrivalTime: int("actualArrivalTime"),
  actualDeliveryTime: int("actualDeliveryTime"),
  driverNotes: text("driverNotes"),
  customerName: varchar("customerName", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 50 }),
  smsNotificationSent: boolean("smsNotificationSent").default(false),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Delivery = typeof deliveries.$inferSelect;
export type InsertDelivery = typeof deliveries.$inferInsert;

/**
 * Quality tests table for QC records
 */
export const qualityTests = mysqlTable("qualityTests", {
  id: int("id").autoincrement().primaryKey(),
  testName: varchar("testName", { length: 255 }).notNull(),
  testType: mysqlEnum("testType", ["slump", "strength", "air_content", "temperature", "other"]).default("other").notNull(),
  result: varchar("result", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 50 }),
  status: mysqlEnum("status", ["pass", "fail", "pending"]).default("pending").notNull(),
  deliveryId: int("deliveryId"),
  projectId: int("projectId"),
  testedBy: varchar("testedBy", { length: 255 }),
  notes: text("notes"),
  photoUrls: text("photoUrls"), // JSON array of S3 photo URLs
  inspectorSignature: text("inspectorSignature"), // Base64 signature image
  supervisorSignature: text("supervisorSignature"), // Base64 signature image
  testLocation: varchar("testLocation", { length: 100 }), // GPS coordinates "lat,lng"
  complianceStandard: varchar("complianceStandard", { length: 50 }), // EN 206, ASTM C94, etc.
  offlineSyncStatus: mysqlEnum("offlineSyncStatus", ["synced", "pending", "failed"]).default("synced"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QualityTest = typeof qualityTests.$inferSelect;
export type InsertQualityTest = typeof qualityTests.$inferInsert;

/**
 * Employees table for workforce management
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  employeeNumber: varchar("employeeNumber", { length: 50 }).notNull().unique(),
  position: varchar("position", { length: 100 }).notNull(),
  department: mysqlEnum("department", ["construction", "maintenance", "quality", "administration", "logistics"]).default("construction").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  email: varchar("email", { length: 320 }),
  hourlyRate: int("hourlyRate"),
  status: mysqlEnum("status", ["active", "inactive", "on_leave"]).default("active").notNull(),
  hireDate: timestamp("hireDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Work hours table for tracking employee working hours
 */
export const workHours = mysqlTable("workHours", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  projectId: int("projectId"),
  date: timestamp("date").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  hoursWorked: int("hoursWorked"),
  overtimeHours: int("overtimeHours").default(0),
  workType: mysqlEnum("workType", ["regular", "overtime", "weekend", "holiday"]).default("regular").notNull(),
  notes: text("notes"),
  approvedBy: int("approvedBy"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkHour = typeof workHours.$inferSelect;
export type InsertWorkHour = typeof workHours.$inferInsert;

/**
 * Concrete bases table for concrete mixing plant management
 */
export const concreteBases = mysqlTable("concreteBases", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 500 }).notNull(),
  capacity: int("capacity").notNull(),
  status: mysqlEnum("status", ["operational", "maintenance", "inactive"]).default("operational").notNull(),
  managerName: varchar("managerName", { length: 255 }),
  phoneNumber: varchar("phoneNumber", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConcreteBase = typeof concreteBases.$inferSelect;
export type InsertConcreteBase = typeof concreteBases.$inferInsert;

/**
 * Machines table for equipment tracking
 */
export const machines = mysqlTable("machines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  machineNumber: varchar("machineNumber", { length: 100 }).notNull().unique(),
  type: mysqlEnum("type", ["mixer", "pump", "truck", "excavator", "crane", "other"]).default("other").notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  year: int("year"),
  concreteBaseId: int("concreteBaseId"),
  status: mysqlEnum("status", ["operational", "maintenance", "repair", "inactive"]).default("operational").notNull(),
  totalWorkingHours: int("totalWorkingHours").default(0),
  lastMaintenanceDate: timestamp("lastMaintenanceDate"),
  nextMaintenanceDate: timestamp("nextMaintenanceDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;

/**
 * Machine maintenance table for tracking lubrication, fuel, and maintenance
 */
export const machineMaintenance = mysqlTable("machineMaintenance", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  date: timestamp("date").notNull(),
  maintenanceType: mysqlEnum("maintenanceType", ["lubrication", "fuel", "oil_change", "repair", "inspection", "other"]).default("other").notNull(),
  description: text("description"),
  lubricationType: varchar("lubricationType", { length: 100 }),
  lubricationAmount: int("lubricationAmount"),
  fuelType: varchar("fuelType", { length: 100 }),
  fuelAmount: int("fuelAmount"),
  cost: int("cost"),
  performedBy: varchar("performedBy", { length: 255 }),
  hoursAtMaintenance: int("hoursAtMaintenance"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineMaintenance = typeof machineMaintenance.$inferSelect;
export type InsertMachineMaintenance = typeof machineMaintenance.$inferInsert;

/**
 * Machine working hours table for tracking equipment usage
 */
export const machineWorkHours = mysqlTable("machineWorkHours", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  projectId: int("projectId"),
  date: timestamp("date").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  hoursWorked: int("hoursWorked"),
  operatorId: int("operatorId"),
  operatorName: varchar("operatorName", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MachineWorkHour = typeof machineWorkHours.$inferSelect;
export type InsertMachineWorkHour = typeof machineWorkHours.$inferInsert;

/**
 * Aggregate input table for tracking raw material input at concrete bases
 */
export const aggregateInputs = mysqlTable("aggregateInputs", {
  id: int("id").autoincrement().primaryKey(),
  concreteBaseId: int("concreteBaseId").notNull(),
  date: timestamp("date").notNull(),
  materialType: mysqlEnum("materialType", ["cement", "sand", "gravel", "water", "admixture", "other"]).default("other").notNull(),
  materialName: varchar("materialName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  supplier: varchar("supplier", { length: 255 }),
  batchNumber: varchar("batchNumber", { length: 100 }),
  receivedBy: varchar("receivedBy", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AggregateInput = typeof aggregateInputs.$inferSelect;
export type InsertAggregateInput = typeof aggregateInputs.$inferInsert;

/**
 * Material consumption log for tracking usage over time
 */
export const materialConsumptionLog = mysqlTable("material_consumption_log", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  quantity: int("quantity").notNull(),
  consumptionDate: timestamp("consumptionDate").notNull(),
  projectId: int("projectId"),
  deliveryId: int("deliveryId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MaterialConsumptionLog = typeof materialConsumptionLog.$inferSelect;
export type InsertMaterialConsumptionLog = typeof materialConsumptionLog.$inferInsert;

/**
 * Purchase orders table for automated ordering
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  materialName: varchar("materialName", { length: 255 }).notNull(),
  quantity: int("quantity").notNull(),
  supplier: varchar("supplier", { length: 255 }),
  supplierEmail: varchar("supplierEmail", { length: 255 }),
  status: mysqlEnum("status", ["pending", "approved", "ordered", "received", "cancelled"]).default("pending").notNull(),
  orderDate: timestamp("orderDate").defaultNow().notNull(),
  expectedDelivery: timestamp("expectedDelivery"),
  actualDelivery: timestamp("actualDelivery"),
  totalCost: int("totalCost"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Forecast predictions table for AI-powered stock predictions
 */
export const forecastPredictions = mysqlTable("forecast_predictions", {
  id: int("id").autoincrement().primaryKey(),
  materialId: int("materialId").notNull(),
  materialName: varchar("materialName", { length: 255 }).notNull(),
  currentStock: int("currentStock").notNull(),
  dailyConsumptionRate: int("dailyConsumptionRate").notNull(),
  predictedRunoutDate: timestamp("predictedRunoutDate"),
  daysUntilStockout: int("daysUntilStockout"),
  recommendedOrderQty: int("recommendedOrderQty"),
  confidence: int("confidence"),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export type ForecastPrediction = typeof forecastPredictions.$inferSelect;
export type InsertForecastPrediction = typeof forecastPredictions.$inferInsert;

/**
 * Report settings table for daily production report customization
 */
export const reportSettings = mysqlTable("report_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  includeProduction: boolean("includeProduction").default(true).notNull(),
  includeDeliveries: boolean("includeDeliveries").default(true).notNull(),
  includeMaterials: boolean("includeMaterials").default(true).notNull(),
  includeQualityControl: boolean("includeQualityControl").default(true).notNull(),
  reportTime: varchar("reportTime", { length: 10 }).default("18:00").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportSettings = typeof reportSettings.$inferSelect;
export type InsertReportSettings = typeof reportSettings.$inferInsert;

/**
 * Report recipients table for managing email recipients
 */
export const reportRecipients = mysqlTable("report_recipients", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReportRecipient = typeof reportRecipients.$inferSelect;
export type InsertReportRecipient = typeof reportRecipients.$inferInsert;

/**
 * Email templates table for customizable email designs
 */
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull().unique(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlTemplate: text("htmlTemplate").notNull(),
  variables: text("variables"), // JSON string of available variables
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Email branding table for company branding customization
 */
export const emailBranding = mysqlTable("email_branding", {
  id: int("id").autoincrement().primaryKey(),
  logoUrl: varchar("logoUrl", { length: 500 }),
  primaryColor: varchar("primaryColor", { length: 20 }).default("#f97316").notNull(),
  secondaryColor: varchar("secondaryColor", { length: 20 }).default("#ea580c").notNull(),
  companyName: varchar("companyName", { length: 255 }).default("AzVirt").notNull(),
  footerText: text("footerText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailBranding = typeof emailBranding.$inferSelect;
export type InsertEmailBranding = typeof emailBranding.$inferInsert;


// AI Assistant Tables
import { sql } from "drizzle-orm";

export const aiConversations = mysqlTable("ai_conversations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  modelName: varchar("modelName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = typeof aiConversations.$inferInsert;

export const aiMessages = mysqlTable("ai_messages", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system", "tool"]).notNull(),
  content: text("content").notNull(),
  model: varchar("model", { length: 100 }),
  audioUrl: text("audioUrl"),
  imageUrl: text("imageUrl"),
  thinkingProcess: text("thinkingProcess"), // JSON string
  toolCalls: text("toolCalls"), // JSON string
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiMessage = typeof aiMessages.$inferSelect;
export type InsertAiMessage = typeof aiMessages.$inferInsert;

export const aiModels = mysqlTable("ai_models", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["text", "vision", "code"]).notNull(),
  size: varchar("size", { length: 20 }),
  isAvailable: boolean("isAvailable").default(false),
  lastUsed: timestamp("lastUsed"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiModel = typeof aiModels.$inferSelect;
export type InsertAiModel = typeof aiModels.$inferInsert;


/**
 * Daily Tasks table for task management
 */
export const dailyTasks = mysqlTable("daily_tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  assignedTo: int("assignedTo"),
  category: varchar("category", { length: 100 }),
  tags: json("tags"),
  attachments: json("attachments"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = typeof dailyTasks.$inferInsert;

/**
 * Task Assignments table for responsibility tracking
 */
export const taskAssignments = mysqlTable("task_assignments", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  assignedTo: int("assignedTo").notNull(),
  assignedBy: int("assignedBy").notNull(),
  responsibility: varchar("responsibility", { length: 255 }).notNull(),
  completionPercentage: int("completionPercentage").default(0).notNull(),
  notes: text("notes"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = typeof taskAssignments.$inferInsert;

/**
 * Task Status History table for audit trail
 */
export const taskStatusHistory = mysqlTable("task_status_history", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  previousStatus: varchar("previousStatus", { length: 50 }),
  newStatus: varchar("newStatus", { length: 50 }).notNull(),
  changedBy: int("changedBy").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskStatusHistory = typeof taskStatusHistory.$inferSelect;
export type InsertTaskStatusHistory = typeof taskStatusHistory.$inferInsert;


/**
 * Task Notifications table for tracking task-related notifications
 */
export const taskNotifications = mysqlTable("task_notifications", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["overdue_reminder", "completion_confirmation", "assignment", "status_change", "comment"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "read"]).default("pending").notNull(),
  channels: json("channels"), // Array of 'email', 'sms', 'in_app'
  scheduledFor: timestamp("scheduledFor"),
  sentAt: timestamp("sentAt"),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaskNotification = typeof taskNotifications.$inferSelect;
export type InsertTaskNotification = typeof taskNotifications.$inferInsert;

/**
 * Notification Preferences table for user notification settings
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  smsEnabled: boolean("smsEnabled").default(false).notNull(),
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  overdueReminders: boolean("overdueReminders").default(true).notNull(),
  completionNotifications: boolean("completionNotifications").default(true).notNull(),
  assignmentNotifications: boolean("assignmentNotifications").default(true).notNull(),
  statusChangeNotifications: boolean("statusChangeNotifications").default(true).notNull(),
  quietHoursStart: varchar("quietHoursStart", { length: 5 }), // HH:MM format
  quietHoursEnd: varchar("quietHoursEnd", { length: 5 }), // HH:MM format
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

/**
 * Notification History table for audit trail and analytics
 */
export const notificationHistory = mysqlTable("notification_history", {
  id: int("id").autoincrement().primaryKey(),
  notificationId: int("notificationId").notNull(),
  userId: int("userId").notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "in_app"]).notNull(),
  status: mysqlEnum("status", ["sent", "failed", "bounced", "opened"]).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  openedAt: timestamp("openedAt"),
  metadata: json("metadata"), // Additional tracking data
});

export type NotificationHistoryRecord = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;


/**
 * Notification Templates table for customizable notification messages
 */
export const notificationTemplates = mysqlTable("notification_templates", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  subject: varchar("subject", { length: 255 }).notNull(),
  bodyText: text("bodyText").notNull(),
  bodyHtml: text("bodyHtml"),
  channels: json("channels").$type<("email" | "sms" | "in_app")[]>().notNull(),
  variables: json("variables").$type<string[]>(),
  tags: json("tags").$type<string[]>(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;

/**
 * Notification Triggers table for rule-based notification automation
 */
export const notificationTriggers = mysqlTable("notification_triggers", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("createdBy").notNull(),
  templateId: int("templateId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  triggerCondition: json("triggerCondition").$type<{
    operator: "and" | "or";
    conditions: Array<{
      field: string;
      operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "in";
      value: any;
    }>;
  }>().notNull(),
  actions: json("actions").$type<{
    notifyUsers: "assignee" | "manager" | "all" | string[];
    sendImmediately: boolean;
    delayMinutes?: number;
    maxNotificationsPerDay?: number;
  }>().notNull(),
  isActive: boolean("isActive").notNull().default(true),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  triggerCount: int("triggerCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationTrigger = typeof notificationTriggers.$inferSelect;
export type InsertNotificationTrigger = typeof notificationTriggers.$inferInsert;

/**
 * Trigger Execution Log table for tracking trigger evaluations
 */
export const triggerExecutionLog = mysqlTable("trigger_execution_log", {
  id: int("id").autoincrement().primaryKey(),
  triggerId: int("triggerId").notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: int("entityId").notNull(),
  conditionsMet: boolean("conditionsMet").notNull(),
  notificationsSent: int("notificationsSent").notNull().default(0),
  error: text("error"),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
});

export type TriggerExecutionLog = typeof triggerExecutionLog.$inferSelect;
export type InsertTriggerExecutionLog = typeof triggerExecutionLog.$inferInsert;

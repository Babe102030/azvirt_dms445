import {
  integer,
  sqliteTable,
  text,
  real,
  blob,
} from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role").default("user").notNull(),
  phoneNumber: text("phoneNumber"),
  smsNotificationsEnabled: integer("smsNotificationsEnabled", {
    mode: "boolean",
  })
    .default(false)
    .notNull(),
  languagePreference: text("languagePreference").default("en").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table for construction projects
 */
export const projects = sqliteTable("projects", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  status: text("status").default("planning").notNull(),
  startDate: integer("startDate", { mode: "timestamp" }),
  endDate: integer("endDate", { mode: "timestamp" }),
  createdBy: integer("createdBy").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Materials table for inventory management
 */
export const materials = sqliteTable("materials", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").default("other").notNull(),
  unit: text("unit").notNull(),
  quantity: real("quantity").notNull().default(0),
  minStock: real("minStock").notNull().default(0),
  criticalThreshold: real("criticalThreshold").notNull().default(0),
  supplier: text("supplier"),
  unitPrice: integer("unitPrice"),
  lowStockEmailSent: integer("lowStockEmailSent", { mode: "boolean" }).default(
    false,
  ),
  lastEmailSentAt: integer("lastEmailSentAt", { mode: "timestamp" }),
  supplierEmail: text("supplierEmail"),
  leadTimeDays: integer("leadTimeDays").default(7),
  reorderPoint: real("reorderPoint"),
  optimalOrderQuantity: real("optimalOrderQuantity"),
  supplierId: integer("supplierId"),
  lastOrderDate: integer("lastOrderDate", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

/**
 * Suppliers for materials
 */
export const suppliers = sqliteTable("suppliers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contactPerson: text("contactPerson"),
  email: text("email"),
  phone: text("phone"),
  averageLeadTimeDays: integer("averageLeadTimeDays"),
  onTimeDeliveryRate: real("onTimeDeliveryRate"), // Percentage
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Material consumption history for forecasting
 */
export const materialConsumptionHistory = sqliteTable(
  "material_consumption_history",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    materialId: integer("materialId")
      .references(() => materials.id)
      .notNull(),
    date: integer("date", { mode: "timestamp" })
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
    quantityUsed: real("quantityUsed").notNull(),
    deliveryId: integer("deliveryId").references(() => deliveries.id),
  },
);

/**
 * Purchase orders for materials
 */
export const purchaseOrders = sqliteTable("purchase_orders", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  supplierId: integer("supplierId")
    .references(() => suppliers.id)
    .notNull(),
  orderDate: integer("orderDate", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  expectedDeliveryDate: integer("expectedDeliveryDate", { mode: "timestamp" }),
  actualDeliveryDate: integer("actualDeliveryDate", { mode: "timestamp" }),
  status: text("status").default("draft").notNull(), // draft, sent, confirmed, received, cancelled
  totalCost: real("totalCost"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const purchaseOrderItems = sqliteTable("purchase_order_items", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  purchaseOrderId: integer("purchaseOrderId")
    .references(() => purchaseOrders.id)
    .notNull(),
  materialId: integer("materialId")
    .references(() => materials.id)
    .notNull(),
  quantity: real("quantity").notNull(),
  unitPrice: real("unitPrice").notNull(),
});

/**
 * Concrete Recipes
 */
export const concreteRecipes = sqliteTable("concrete_recipes", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  targetStrength: text("targetStrength"),
  slump: text("slump"),
  maxAggregateSize: text("maxAggregateSize"),
  yieldVolume: real("yieldVolume").default(1.0),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  recipeId: integer("recipeId")
    .references(() => concreteRecipes.id)
    .notNull(),
  materialId: integer("materialId")
    .references(() => materials.id)
    .notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
});

/**
 * Production / Mixing Logs
 */
export const mixingLogs = sqliteTable("mixing_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId").references(() => projects.id),
  deliveryId: integer("deliveryId"), // Circular dependency potential, handled by logic
  recipeId: integer("recipeId").references(() => concreteRecipes.id),
  recipeName: text("recipeName"),
  batchNumber: text("batchNumber").notNull().unique(),
  volume: real("volume").notNull(),
  unit: text("unit").default("m3").notNull(),
  status: text("status").default("planned").notNull(), // planned, in_progress, completed, rejected
  startTime: integer("startTime", { mode: "timestamp" }),
  endTime: integer("endTime", { mode: "timestamp" }),
  operatorId: integer("operatorId").references(() => users.id),
  approvedBy: integer("approvedBy").references(() => users.id),
  qualityNotes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const batchIngredients = sqliteTable("batch_ingredients", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  batchId: integer("batchId")
    .references(() => mixingLogs.id)
    .notNull(),
  materialId: integer("materialId")
    .references(() => materials.id)
    .notNull(),
  plannedQuantity: real("plannedQuantity").notNull(),
  actualQuantity: real("actualQuantity"),
  unit: text("unit").notNull(),
  inventoryDeducted: integer("inventoryDeducted", { mode: "boolean" })
    .default(false)
    .notNull(),
});

/**
 * Deliveries
 */
export const deliveries = sqliteTable("deliveries", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId").references(() => projects.id),
  projectName: text("projectName"),
  recipeId: integer("recipeId").references(() => concreteRecipes.id),
  concreteType: text("concreteType"),
  volume: real("volume"),
  batchId: integer("batchId").references(() => mixingLogs.id),
  ticketNumber: text("ticketNumber").unique(),
  truckNumber: text("truckNumber"),
  vehicleNumber: text("vehicleNumber"),
  driverId: integer("driverId").references(() => users.id),
  driverName: text("driverName"),
  status: text("status").default("scheduled").notNull(), // scheduled, loaded, en_route, arrived, delivered, returning, completed, cancelled
  scheduledTime: integer("scheduledTime", { mode: "timestamp" }).notNull(),
  startTime: integer("startTime", { mode: "timestamp" }),
  arrivalTime: integer("arrivalTime", { mode: "timestamp" }),
  deliveryTime: integer("deliveryTime", { mode: "timestamp" }),
  completionTime: integer("completionTime", { mode: "timestamp" }),
  estimatedArrival: integer("estimatedArrival"),
  actualArrivalTime: integer("actualArrivalTime"),
  actualDeliveryTime: integer("actualDeliveryTime"),
  gpsLocation: text("gpsLocation"), // lat,lng
  photos: text("photos"), // JSON array of strings
  deliveryPhotos: text("deliveryPhotos"), // JSON array of strings (backwards compat)
  notes: text("notes"),
  driverNotes: text("driverNotes"),
  customerName: text("customerName"),
  customerPhone: text("customerPhone"),
  smsNotificationSent: integer("smsNotificationSent", {
    mode: "boolean",
  }).default(false),
  createdBy: integer("createdBy").references(() => users.id),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Delivery Status History for tracking status changes with GPS
 */
export const deliveryStatusHistory = sqliteTable("delivery_status_history", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  deliveryId: integer("deliveryId")
    .references(() => deliveries.id)
    .notNull(),
  status: text("status").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  gpsLocation: text("gpsLocation"), // lat,lng
  notes: text("notes"),
  createdBy: integer("createdBy").references(() => users.id),
});

/**
 * Quality Tests
 */
export const qualityTests = sqliteTable("quality_tests", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  deliveryId: integer("deliveryId").references(() => deliveries.id),
  projectId: integer("projectId").references(() => projects.id),
  testName: text("testName"),
  testType: text("testType").notNull(), // slump, strength, air_content, temperature, other
  result: text("result"),
  resultValue: text("resultValue"), // legacy
  unit: text("unit"),
  status: text("status").default("pending").notNull(), // pass, fail, pending
  testedByUserId: integer("testedByUserId").references(() => users.id),
  testedBy: text("testedBy"), // can be string name or user ID
  testedAt: integer("testedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  photos: text("photos"), // JSON array
  photoUrls: text("photoUrls"), // JSON array (backwards compat)
  notes: text("notes"),
  inspectorSignature: text("inspectorSignature"), // base64
  supervisorSignature: text("supervisorSignature"), // base64
  gpsLocation: text("gpsLocation"),
  testLocation: text("testLocation"),
  standardUsed: text("standardUsed").default("EN 206"),
  complianceStandard: text("complianceStandard"),
  syncStatus: text("syncStatus").default("synced"), // synced, pending, failed
  offlineSyncStatus: text("offlineSyncStatus"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Employees and HR
 */
export const employees = sqliteTable("employees", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .references(() => users.id)
    .unique(),
  employeeNumber: text("employeeNumber").unique(),
  firstName: text("firstName").notNull(),
  lastName: text("lastName").notNull(),
  jobTitle: text("jobTitle"),
  department: text("department"),
  hireDate: integer("hireDate", { mode: "timestamp" }),
  hourlyRate: integer("hourlyRate"),
  active: integer("active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const shiftTemplates = sqliteTable("shift_templates", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  startTime: text("startTime").notNull(), // HH:mm
  endTime: text("endTime").notNull(), // HH:mm
  durationHours: real("durationHours"),
  color: text("color"),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const shifts = sqliteTable("shifts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  employeeId: integer("employeeId")
    .references(() => users.id)
    .notNull(), // Linked to User for easier auth checks
  templateId: integer("templateId").references(() => shiftTemplates.id),
  startTime: integer("startTime", { mode: "timestamp" }).notNull(),
  endTime: integer("endTime", { mode: "timestamp" }),
  status: text("status").default("scheduled").notNull(), // scheduled, in_progress, completed, cancelled, no_show
  createdBy: integer("createdBy").references(() => users.id),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const employeeAvailability = sqliteTable("employee_availability", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  employeeId: integer("employeeId")
    .references(() => users.id)
    .notNull(),
  dayOfWeek: integer("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  startTime: text("startTime").notNull(),
  endTime: text("endTime").notNull(),
  isAvailable: integer("isAvailable", { mode: "boolean" })
    .default(true)
    .notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const shiftSwaps = sqliteTable("shift_swaps", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  shiftId: integer("shiftId")
    .references(() => shifts.id)
    .notNull(),
  fromEmployeeId: integer("fromEmployeeId")
    .references(() => users.id)
    .notNull(),
  toEmployeeId: integer("toEmployeeId").references(() => users.id),
  status: text("status").default("pending").notNull(), // pending, approved, rejected, cancelled
  requestedAt: integer("requestedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  respondedAt: integer("respondedAt", { mode: "timestamp" }),
  notes: text("notes"),
});

export const shiftBreaks = sqliteTable("shift_breaks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  shiftId: integer("shiftId")
    .references(() => shifts.id)
    .notNull(),
  startTime: integer("startTime", { mode: "timestamp" }).notNull(),
  endTime: integer("endTime", { mode: "timestamp" }),
  type: text("type").default("unpaid").notNull(), // paid, unpaid
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const timesheetApprovals = sqliteTable("timesheet_approvals", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  shiftId: integer("shiftId")
    .references(() => shifts.id)
    .notNull(),
  approverId: integer("approverId").references(() => users.id),
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  approvedAt: integer("approvedAt", { mode: "timestamp" }),
  comments: text("comments"),
  rejectionReason: text("rejectionReason"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const complianceAuditTrail = sqliteTable("compliance_audit_trail", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  employeeId: integer("employeeId")
    .references(() => users.id)
    .notNull(),
  action: text("action").notNull(),
  entityType: text("entityType").notNull(), // shift, timesheet, etc.
  entityId: integer("entityId").notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  reason: text("reason"),
  performedBy: integer("performedBy")
    .references(() => users.id)
    .notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Assets and Maintenance
 */
export const machines = sqliteTable("machines", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type"),
  serialNumber: text("serialNumber"),
  status: text("status").default("active"),
  lastMaintenanceAt: integer("lastMaintenanceAt", { mode: "timestamp" }),
  totalWorkingHours: real("totalWorkingHours").default(0),
  concreteBaseId: integer("concreteBaseId").references(() => concreteBases.id),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const machineWorkHours = sqliteTable("machine_work_hours", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  machineId: integer("machineId")
    .references(() => machines.id)
    .notNull(),
  hours: real("hours").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  operatorId: integer("operatorId").references(() => users.id),
});

export const workHours = sqliteTable("work_hours", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  employeeId: integer("employeeId")
    .references(() => users.id)
    .notNull(),
  projectId: integer("projectId").references(() => projects.id),
  date: integer("date", { mode: "timestamp" }).notNull(),
  hoursWorked: text("hoursWorked").notNull(),
  notes: text("notes"),
  status: text("status").default("pending").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Tasks and AI
 */
export const tasks = sqliteTable("tasks", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(), // pending, in_progress, completed, cancelled
  priority: text("priority").default("medium"), // low, medium, high, critical
  dueDate: integer("dueDate", { mode: "timestamp" }),
  projectId: integer("projectId").references(() => projects.id),
  createdBy: integer("createdBy")
    .references(() => users.id)
    .notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const taskAssignments = sqliteTable("task_assignments", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  taskId: integer("taskId")
    .references(() => tasks.id)
    .notNull(),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  assignedAt: integer("assignedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const aiConversations = sqliteTable("ai_conversations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  modelName: text("modelName"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const aiMessages = sqliteTable("ai_messages", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  conversationId: integer("conversationId")
    .references(() => aiConversations.id)
    .notNull(),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: text("metadata"), // JSON
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * System and Notifications
 */
export const notifications = sqliteTable("notifications", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type"),
  status: text("status").default("unread"), // unread, read, archived
  sentAt: integer("sentAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Notification Templates
 */
export const notificationTemplates = sqliteTable("notification_templates", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  bodyText: text("bodyText").notNull(),
  channels: text("channels").notNull(), // JSON array of channels: ["email", "sms", "in_app"]
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Notification Triggers
 */
export const notificationTriggers = sqliteTable("notification_triggers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  eventType: text("eventType").notNull(), // stock_level_change, delivery_status_change, etc.
  templateId: integer("templateId")
    .references(() => notificationTemplates.id)
    .notNull(),
  triggerCondition: text("triggerCondition").notNull(), // JSON representation of conditions
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  lastExecutedAt: integer("lastExecutedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Notification History (Tracking sent messages)
 */
export const notificationHistory = sqliteTable("notification_history", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  notificationId: integer("notificationId"), // Internal ID if available
  userId: integer("userId").references(() => users.id),
  channel: text("channel").notNull(), // email, sms, in_app
  status: text("status").notNull(), // sent, failed, pending
  recipient: text("recipient").notNull(), // email address or phone number
  errorMessage: text("errorMessage"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Trigger Execution Logs
 */
export const triggerExecutionLogs = sqliteTable("trigger_execution_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  triggerId: integer("triggerId").references(() => notificationTriggers.id),
  entityType: text("entityType").notNull(),
  entityId: integer("entityId").notNull(),
  conditionsMet: integer("conditionsMet", { mode: "boolean" }).notNull(),
  notificationsSent: integer("notificationsSent").default(0),
  error: text("error"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const documents = sqliteTable("documents", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type"),
  url: text("url").notNull(),
  projectId: integer("projectId").references(() => projects.id),
  uploadedBy: integer("uploadedBy").references(() => users.id),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Project Sites table for geolocation check-in system
 * Stores geofence boundaries and metadata for job sites
 */
export const projectSites = sqliteTable("projectSites", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  projectId: integer("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  radiusMeters: integer("radiusMeters").notNull().default(50),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zipCode"),
  country: text("country"),
  isActive: integer("isActive", { mode: "boolean" }).notNull().default(true),
  createdBy: integer("createdBy").references(() => users.id),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type ProjectSite = typeof projectSites.$inferSelect;
export type InsertProjectSite = typeof projectSites.$inferInsert;

/**
 * Check-In Records table for geolocation check-in system
 * Logs all employee check-ins with location data and accuracy metrics
 */
export const checkInRecords = sqliteTable("checkInRecords", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  shiftId: integer("shiftId")
    .notNull()
    .references(() => shifts.id, { onDelete: "cascade" }),
  employeeId: integer("employeeId")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  projectSiteId: integer("projectSiteId")
    .notNull()
    .references(() => projectSites.id, { onDelete: "restrict" }),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy").notNull(),
  distanceFromSiteMeters: real("distanceFromSiteMeters"),
  isWithinGeofence: integer("isWithinGeofence", { mode: "boolean" }).notNull(),
  checkInType: text("checkInType").notNull().default("check_in"),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type InsertCheckInRecord = typeof checkInRecords.$inferInsert;

/**
 * Concrete Bases table for managing concrete production facilities
 */
export const concreteBases = sqliteTable("concrete_bases", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  location: text("location"),
  capacity: integer("capacity"), // m3 per hour
  status: text("status").default("active").notNull(), // active, maintenance, inactive
  managerName: text("managerName"),
  phoneNumber: text("phoneNumber"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/**
 * Aggregate Inputs table for tracking materials received at concrete bases
 */
export type ConcreteBase = typeof concreteBases.$inferSelect;
export type InsertConcreteBase = typeof concreteBases.$inferInsert;

export const aggregateInputs = sqliteTable("aggregate_inputs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  concreteBaseId: integer("concreteBaseId")
    .references(() => concreteBases.id, { onDelete: "cascade" })
    .notNull(),
  date: integer("date", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  materialType: text("materialType").notNull(), // cement, sand, gravel, etc.
  materialName: text("materialName").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  supplier: text("supplier"),
  batchNumber: text("batchNumber"),
  receivedBy: text("receivedBy"),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type AggregateInput = typeof aggregateInputs.$inferSelect;
export type InsertAggregateInput = typeof aggregateInputs.$inferInsert;

/**
 * Email Templates - Custom templates for system emails
 */
export const emailTemplates = sqliteTable("email_templates", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  type: text("type").notNull().unique(), // daily_production_report, low_stock_alert, purchase_order, generic_notification
  name: text("name").notNull(),
  description: text("description"),
  subject: text("subject").notNull(),
  bodyHtml: text("bodyHtml").notNull(),
  bodyText: text("bodyText"), // Plain text fallback
  isCustom: integer("isCustom", { mode: "boolean" }).default(false).notNull(), // true if user customized
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  variables: text("variables"), // JSON array of available variables
  createdBy: integer("createdBy").references(() => users.id),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * Email Branding - Company branding settings for emails
 */
export const emailBranding = sqliteTable("email_branding", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  logoUrl: text("logoUrl"),
  primaryColor: text("primaryColor").default("#f97316").notNull(),
  secondaryColor: text("secondaryColor").default("#ea580c").notNull(),
  companyName: text("companyName").default("AzVirt").notNull(),
  footerText: text("footerText"),
  headerStyle: text("headerStyle").default("gradient").notNull(), // gradient, solid, minimal
  fontFamily: text("fontFamily").default("Arial, sans-serif").notNull(),
  updatedBy: integer("updatedBy").references(() => users.id),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type EmailBranding = typeof emailBranding.$inferSelect;
export type InsertEmailBranding = typeof emailBranding.$inferInsert;

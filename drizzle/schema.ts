import { boolean, integer, pgTable, serial, text, timestamp, varchar, decimal, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: varchar("role", { length: 20 }).default("user").notNull(),
    phoneNumber: varchar("phoneNumber", { length: 50 }),
    smsNotificationsEnabled: boolean("smsNotificationsEnabled").default(false).notNull(),
    languagePreference: varchar("languagePreference", { length: 10 }).default("en").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    lastSignedIn: timestamp("lastSignedIn").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table for construction projects
 */
export const projects = pgTable("projects", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    location: varchar("location", { length: 500 }),
    status: varchar("status", { length: 20 }).default("planning").notNull(),
    startDate: timestamp("startDate"),
    endDate: timestamp("endDate"),
    createdBy: integer("createdBy").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Materials table for inventory management
 */
export const materials = pgTable("materials", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 20 }).default("other").notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
    quantity: doublePrecision("quantity").notNull().default(0),
    minStock: doublePrecision("minStock").notNull().default(0),
    criticalThreshold: doublePrecision("criticalThreshold").notNull().default(0),
    supplier: varchar("supplier", { length: 255 }),
    unitPrice: integer("unitPrice"),
    lowStockEmailSent: boolean("lowStockEmailSent").default(false),
    lastEmailSentAt: timestamp("lastEmailSentAt"),
    supplierEmail: varchar("supplierEmail", { length: 255 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

/**
 * Concrete Recipes
 */
export const concreteRecipes = pgTable("concrete_recipes", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    targetStrength: varchar("targetStrength", { length: 50 }),
    slump: varchar("slump", { length: 50 }),
    maxAggregateSize: varchar("maxAggregateSize", { length: 50 }),
    yieldVolume: doublePrecision("yieldVolume").default(1.0),
    notes: text("notes"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const recipeIngredients = pgTable("recipe_ingredients", {
    id: serial("id").primaryKey(),
    recipeId: integer("recipeId").references(() => concreteRecipes.id).notNull(),
    materialId: integer("materialId").references(() => materials.id).notNull(),
    quantity: doublePrecision("quantity").notNull(),
    unit: varchar("unit", { length: 50 }).notNull(),
});

/**
 * Production / Mixing Logs
 */
export const mixingLogs = pgTable("mixing_logs", {
    id: serial("id").primaryKey(),
    projectId: integer("projectId").references(() => projects.id),
    deliveryId: integer("deliveryId"), // Circular dependency potential, handled by logic
    recipeId: integer("recipeId").references(() => concreteRecipes.id),
    recipeName: varchar("recipeName", { length: 255 }),
    batchNumber: varchar("batchNumber", { length: 100 }).notNull().unique(),
    volume: doublePrecision("volume").notNull(),
    unit: varchar("unit", { length: 50 }).default("m3").notNull(),
    status: varchar("status", { length: 20 }).default("planned").notNull(), // planned, in_progress, completed, rejected
    startTime: timestamp("startTime"),
    endTime: timestamp("endTime"),
    operatorId: integer("operatorId").references(() => users.id),
    approvedBy: integer("approvedBy").references(() => users.id),
    qualityNotes: text("notes"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const batchIngredients = pgTable("batch_ingredients", {
    id: serial("id").primaryKey(),
    batchId: integer("batchId").references(() => mixingLogs.id).notNull(),
    materialId: integer("materialId").references(() => materials.id).notNull(),
    plannedQuantity: doublePrecision("plannedQuantity").notNull(),
    actualQuantity: doublePrecision("actualQuantity"),
    unit: varchar("unit", { length: 50 }).notNull(),
    inventoryDeducted: boolean("inventoryDeducted").default(false).notNull(),
});

/**
 * Deliveries
 */
export const deliveries = pgTable("deliveries", {
    id: serial("id").primaryKey(),
    projectId: integer("projectId").references(() => projects.id),
    projectName: varchar("projectName", { length: 255 }),
    recipeId: integer("recipeId").references(() => concreteRecipes.id),
    concreteType: varchar("concreteType", { length: 100 }),
    volume: doublePrecision("volume"),
    batchId: integer("batchId").references(() => mixingLogs.id),
    ticketNumber: varchar("ticketNumber", { length: 100 }).unique(),
    truckNumber: varchar("truckNumber", { length: 50 }),
    vehicleNumber: varchar("vehicleNumber", { length: 50 }),
    driverId: integer("driverId").references(() => users.id),
    driverName: varchar("driverName", { length: 255 }),
    status: varchar("status", { length: 20 }).default("scheduled").notNull(), // scheduled, loaded, en_route, arrived, delivered, returning, completed, cancelled
    scheduledTime: timestamp("scheduledTime").notNull(),
    startTime: timestamp("startTime"),
    arrivalTime: timestamp("arrivalTime"),
    deliveryTime: timestamp("deliveryTime"),
    completionTime: timestamp("completionTime"),
    estimatedArrival: integer("estimatedArrival"),
    actualArrivalTime: integer("actualArrivalTime"),
    actualDeliveryTime: integer("actualDeliveryTime"),
    gpsLocation: varchar("gpsLocation", { length: 100 }), // lat,lng
    photos: text("photos"), // JSON array of strings
    deliveryPhotos: text("deliveryPhotos"), // JSON array of strings (backwards compat)
    notes: text("notes"),
    driverNotes: text("driverNotes"),
    customerName: varchar("customerName", { length: 255 }),
    customerPhone: varchar("customerPhone", { length: 50 }),
    smsNotificationSent: boolean("smsNotificationSent").default(false),
    createdBy: integer("createdBy").references(() => users.id),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

/**
 * Quality Tests
 */
export const qualityTests = pgTable("quality_tests", {
    id: serial("id").primaryKey(),
    deliveryId: integer("deliveryId").references(() => deliveries.id),
    projectId: integer("projectId").references(() => projects.id),
    testName: varchar("testName", { length: 255 }),
    testType: varchar("testType", { length: 50 }).notNull(), // slump, strength, air_content, temperature, other
    result: varchar("result", { length: 100 }),
    resultValue: varchar("resultValue", { length: 100 }), // legacy
    unit: varchar("unit", { length: 50 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pass, fail, pending
    testedByUserId: integer("testedByUserId").references(() => users.id),
    testedBy: varchar("testedBy", { length: 255 }), // can be string name or user ID
    testedAt: timestamp("testedAt").notNull().defaultNow(),
    photos: text("photos"), // JSON array
    photoUrls: text("photoUrls"), // JSON array (backwards compat)
    notes: text("notes"),
    inspectorSignature: text("inspectorSignature"), // base64
    supervisorSignature: text("supervisorSignature"), // base64
    gpsLocation: varchar("gpsLocation", { length: 100 }),
    testLocation: varchar("testLocation", { length: 100 }),
    standardUsed: varchar("standardUsed", { length: 100 }).default("EN 206"),
    complianceStandard: varchar("complianceStandard", { length: 100 }),
    syncStatus: varchar("syncStatus", { length: 20 }).default("synced"), // synced, pending, failed
    offlineSyncStatus: varchar("offlineSyncStatus", { length: 20 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

/**
 * Employees and HR
 */
export const employees = pgTable("employees", {
    id: serial("id").primaryKey(),
    userId: integer("userId").references(() => users.id).unique(),
    employeeNumber: varchar("employeeNumber", { length: 50 }).unique(),
    firstName: varchar("firstName", { length: 100 }).notNull(),
    lastName: varchar("lastName", { length: 100 }).notNull(),
    jobTitle: varchar("jobTitle", { length: 100 }),
    department: varchar("department", { length: 100 }),
    hireDate: timestamp("hireDate"),
    hourlyRate: integer("hourlyRate"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const shifts = pgTable("shifts", {
    id: serial("id").primaryKey(),
    employeeId: integer("employeeId").references(() => users.id).notNull(), // Linked to User for easier auth checks
    startTime: timestamp("startTime").notNull(),
    endTime: timestamp("endTime"),
    status: varchar("status", { length: 20 }).default("scheduled").notNull(), // scheduled, in_progress, completed, cancelled, no_show
    createdBy: integer("createdBy").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const timesheetApprovals = pgTable("timesheet_approvals", {
    id: serial("id").primaryKey(),
    shiftId: integer("shiftId").references(() => shifts.id).notNull(),
    approverId: integer("approverId").references(() => users.id),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, approved, rejected
    approvedAt: timestamp("approvedAt"),
    comments: text("comments"),
    rejectionReason: text("rejectionReason"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
});

/**
 * Assets and Maintenance
 */
export const machines = pgTable("machines", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 100 }),
    serialNumber: varchar("serialNumber", { length: 100 }),
    status: varchar("status", { length: 20 }).default("active"),
    lastMaintenanceAt: timestamp("lastMaintenanceAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const machineWorkHours = pgTable("machine_work_hours", {
    id: serial("id").primaryKey(),
    machineId: integer("machineId").references(() => machines.id).notNull(),
    hours: doublePrecision("hours").notNull(),
    date: timestamp("date").notNull(),
    operatorId: integer("operatorId").references(() => users.id),
});

/**
 * Tasks and AI
 */
export const tasks = pgTable("tasks", {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, in_progress, completed, cancelled
    priority: varchar("priority", { length: 20 }).default("medium"), // low, medium, high, critical
    dueDate: timestamp("dueDate"),
    projectId: integer("projectId").references(() => projects.id),
    createdBy: integer("createdBy").references(() => users.id).notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const taskAssignments = pgTable("task_assignments", {
    id: serial("id").primaryKey(),
    taskId: integer("taskId").references(() => tasks.id).notNull(),
    userId: integer("userId").references(() => users.id).notNull(),
    assignedAt: timestamp("assignedAt").notNull().defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
    id: serial("id").primaryKey(),
    userId: integer("userId").references(() => users.id).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    modelName: varchar("modelName", { length: 100 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
    id: serial("id").primaryKey(),
    conversationId: integer("conversationId").references(() => aiConversations.id).notNull(),
    role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
    content: text("content").notNull(),
    metadata: text("metadata"), // JSON
    createdAt: timestamp("createdAt").notNull().defaultNow(),
});

/**
 * System and Notifications
 */
export const notifications = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: integer("userId").references(() => users.id).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    type: varchar("type", { length: 50 }),
    status: varchar("status", { length: 20 }).default("unread"), // unread, read, archived
    sentAt: timestamp("sentAt").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 50 }),
    url: text("url").notNull(),
    projectId: integer("projectId").references(() => projects.id),
    uploadedBy: integer("uploadedBy").references(() => users.id),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
});

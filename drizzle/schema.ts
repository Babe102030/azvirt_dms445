Get started with Neon.Using Neon org org - orange - frost - 82383902 and project super- morning - 58605511.import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    openId: text("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: text("email", { length: 320 }),
    loginMethod: text("loginMethod", { length: 64 }),
    role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
    phoneNumber: text("phoneNumber", { length: 50 }),
    smsNotificationsEnabled: integer("smsNotificationsEnabled", { mode: "boolean" }).default(false).notNull(),
    languagePreference: text("languagePreference", { length: 10 }).default("en").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
    lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects table for construction projects
 */
export const projects = sqliteTable("projects", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 255 }).notNull(),
    description: text("description"),
    location: text("location", { length: 500 }),
    status: text("status", { enum: ["planning", "active", "completed", "on_hold"] }).default("planning").notNull(),
    startDate: integer("startDate", { mode: "timestamp" }),
    endDate: integer("endDate", { mode: "timestamp" }),
    createdBy: integer("createdBy").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Materials table for inventory management
 */
export const materials = sqliteTable("materials", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 255 }).notNull(),
    category: text("category", { enum: ["cement", "aggregate", "admixture", "water", "other"] }).default("other").notNull(),
    unit: text("unit", { length: 50 }).notNull(),
    quantity: integer("quantity").notNull().default(0),
    minStock: integer("minStock").notNull().default(0),
    criticalThreshold: integer("criticalThreshold").notNull().default(0),
    supplier: text("supplier", { length: 255 }),
    unitPrice: integer("unitPrice"),
    lowStockEmailSent: integer("lowStockEmailSent", { mode: "boolean" }).default(false),
    lastEmailSentAt: integer("lastEmailSentAt", { mode: "timestamp" }),
    supplierEmail: text("supplierEmail", { length: 255 }),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

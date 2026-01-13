import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    lastSignedIn: timestamp("lastSignedIn").notNull(),
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
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
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
    quantity: integer("quantity").notNull().default(0),
    minStock: integer("minStock").notNull().default(0),
    criticalThreshold: integer("criticalThreshold").notNull().default(0),
    supplier: varchar("supplier", { length: 255 }),
    unitPrice: integer("unitPrice"),
    lowStockEmailSent: boolean("lowStockEmailSent").default(false),
    lastEmailSentAt: timestamp("lastEmailSentAt"),
    supplierEmail: varchar("supplierEmail", { length: 255 }),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
});

export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

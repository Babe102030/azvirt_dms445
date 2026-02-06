/**
 * EXACT CODE ADDITIONS TO drizzle/schema.ts
 *
 * These tables were added at the END of the drizzle/schema.ts file
 * (after the documents table definition)
 */

/**
 * Project Sites table for geolocation check-in system
 * Stores geofence boundaries and metadata for job sites
 */
export const projectSites = pgTable("projectSites", {
  id: serial("id").primaryKey(),
  projectId: integer("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  radiusMeters: integer("radiusMeters").notNull().default(50),
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zipCode", { length: 20 }),
  country: varchar("country", { length: 100 }),
  isActive: boolean("isActive").notNull().default(true),
  createdBy: integer("createdBy").references(() => users.id),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type ProjectSite = typeof projectSites.$inferSelect;
export type InsertProjectSite = typeof projectSites.$inferInsert;

/**
 * Check-In Records table for geolocation check-in system
 * Logs all employee check-ins with location data and accuracy metrics
 */
export const checkInRecords = pgTable("checkInRecords", {
  id: serial("id").primaryKey(),
  shiftId: integer("shiftId")
    .notNull()
    .references(() => shifts.id, { onDelete: "cascade" }),
  employeeId: integer("employeeId")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),
  projectSiteId: integer("projectSiteId")
    .notNull()
    .references(() => projectSites.id, { onDelete: "restrict" }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy").notNull(),
  distanceFromSiteMeters: doublePrecision("distanceFromSiteMeters"),
  isWithinGeofence: boolean("isWithinGeofence").notNull(),
  checkInType: varchar("checkInType", { length: 20 })
    .notNull()
    .default("check_in"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export type CheckInRecord = typeof checkInRecords.$inferSelect;
export type InsertCheckInRecord = typeof checkInRecords.$inferInsert;

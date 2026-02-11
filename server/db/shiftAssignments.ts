import { getDb } from "../db";
import { shifts, users, employees } from "../../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

/**
 * Get all employees for shift assignment
 */
export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
  // Using the employees table as defined in schema.ts
  return await db.select().from(employees);
}

/**
 * Get shifts for a specific date range
 */
export async function getShiftsForDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(shifts)
    .where(
      and(gte(shifts.startTime, startDate), lte(shifts.startTime, endDate)),
    )
    .orderBy(shifts.startTime);
}

/**
 * Get shifts for a specific employee
 */
export async function getEmployeeShifts(
  employeeId: number,
  startDate: Date,
  endDate: Date,
) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.employeeId, employeeId),
        gte(shifts.startTime, startDate),
        lte(shifts.startTime, endDate),
      ),
    )
    .orderBy(shifts.startTime);
}

/**
 * Assign an employee to a shift
 */
export async function assignEmployeeToShift(
  employeeId: number,
  startTime: Date,
  endTime: Date,
  shiftDate: Date,
  createdBy: number,
) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database connection failed" };

  // Check if employee already has a shift that overlaps or on this date
  // For simplicity, checking if any shift starts on the same day
  const startOfDay = new Date(shiftDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(shiftDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.employeeId, employeeId),
        gte(shifts.startTime, startOfDay),
        lte(shifts.startTime, endOfDay),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      success: false,
      message: "Employee already assigned to a shift on this date",
    };
  }

  try {
    await db.insert(shifts).values({
      employeeId,
      startTime,
      endTime,
      status: "scheduled",
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, message: "Shift assigned successfully" };
  } catch (error) {
    console.error("Failed to assign shift:", error);
    return { success: false, message: "Failed to create shift assignment" };
  }
}

/**
 * Update a shift assignment
 */
export async function updateShiftAssignment(
  shiftId: number,
  updates: { startTime?: Date; endTime?: Date; status?: string },
) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database connection failed" };

  if (Object.keys(updates).length === 0) {
    return { success: false, message: "No updates provided" };
  }

  try {
    await db
      .update(shifts)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(shifts.id, shiftId));

    return { success: true, message: "Shift updated successfully" };
  } catch (error) {
    console.error("Failed to update shift:", error);
    return { success: false, message: "Failed to update shift assignment" };
  }
}

/**
 * Delete a shift assignment
 */
export async function deleteShiftAssignment(shiftId: number) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database connection failed" };

  try {
    await db.delete(shifts).where(eq(shifts.id, shiftId));
    return { success: true, message: "Shift deleted successfully" };
  } catch (error) {
    console.error("Failed to delete shift:", error);
    return { success: false, message: "Failed to delete shift assignment" };
  }
}

/**
 * Check for shift conflicts
 */
export async function checkShiftConflicts(employeeId: number, shiftDate: Date) {
  const db = await getDb();
  if (!db) return [];

  const startOfDay = new Date(shiftDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(shiftDate);
  endOfDay.setHours(23, 59, 59, 999);

  return await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.employeeId, employeeId),
        gte(shifts.startTime, startOfDay),
        lte(shifts.startTime, endOfDay),
      ),
    );
}

/**
 * Get shift by ID
 */
export async function getShiftById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(shifts).where(eq(shifts.id, id));

  return result[0] || null;
}

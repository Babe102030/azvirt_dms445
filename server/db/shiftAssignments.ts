import { getDb } from "../db";
import { shifts, employees } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

/**
 * Get all employees for shift assignment
 */
export async function getAllEmployees() {
  const db = await getDb();
  if (!db) return [];
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
      and(
        gte(shifts.shiftDate, startDate),
        lte(shifts.shiftDate, endDate)
      )
    )
    .orderBy(shifts.shiftDate);
}

/**
 * Get shifts for a specific employee
 */
export async function getEmployeeShifts(employeeId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.employeeId, employeeId),
        gte(shifts.shiftDate, startDate),
        lte(shifts.shiftDate, endDate)
      )
    )
    .orderBy(shifts.shiftDate);
}

/**
 * Assign an employee to a shift
 */
export async function assignEmployeeToShift(
  employeeId: number,
  startTime: Date,
  endTime: Date,
  shiftDate: Date,
  createdBy: number
) {
  const db = await getDb();
  if (!db) return null;

  // Check if employee already has a shift on this date
  const existing = await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.employeeId, employeeId),
        eq(shifts.shiftDate, shiftDate)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return { success: false, message: "Employee already assigned to a shift on this date" };
  }

  const result = await db.insert(shifts).values({
    employeeId,
    shiftDate,
    startTime,
    endTime,
    status: "scheduled",
    createdBy,
  });

  return { success: true, message: "Shift assigned successfully" };
}

/**
 * Update a shift assignment
 */
export async function updateShiftAssignment(
  shiftId: number,
  updates: { startTime?: Date; endTime?: Date; status?: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show" }
) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database connection failed" };

  if (Object.keys(updates).length === 0) {
    return { success: false, message: "No updates provided" };
  }

  await db.update(shifts).set(updates).where(eq(shifts.id, shiftId));

  return { success: true, message: "Shift updated successfully" };
}

/**
 * Delete a shift assignment
 */
export async function deleteShiftAssignment(shiftId: number) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database connection failed" };

  await db.delete(shifts).where(eq(shifts.id, shiftId));

  return { success: true, message: "Shift deleted successfully" };
}

/**
 * Check for shift conflicts
 */
export async function checkShiftConflicts(employeeId: number, shiftDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.employeeId, employeeId),
        eq(shifts.shiftDate, shiftDate)
      )
    );
}

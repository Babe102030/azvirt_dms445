import { getDb } from "../db";
import { timesheetApprovals, workHours, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get all pending timesheets for approval by a manager
 */
export async function getPendingTimesheets(approverId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: workHours.id,
      employeeId: workHours.employeeId,
      employeeName: users.name,
      date: workHours.date,
      hoursWorked: workHours.hoursWorked,
      status: workHours.status,
      notes: workHours.notes,
      approvalStatus: timesheetApprovals.status,
      approvalId: timesheetApprovals.id,
    })
    .from(workHours)
    .leftJoin(timesheetApprovals, eq(workHours.id, timesheetApprovals.timesheetId))
    .leftJoin(users, eq(workHours.employeeId, users.id))
    .where(
      and(
        eq(workHours.status, "pending"),
        eq(timesheetApprovals.approverId, approverId),
        eq(timesheetApprovals.status, "pending")
      )
    );
}

/**
 * Get all timesheets for an employee
 */
export async function getEmployeeTimesheets(employeeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: workHours.id,
      date: workHours.date,
      hoursWorked: workHours.hoursWorked,
      status: workHours.status,
      notes: workHours.notes,
      approvalStatus: timesheetApprovals.status,
      approvalComments: timesheetApprovals.comments,
      rejectionReason: timesheetApprovals.rejectionReason,
    })
    .from(workHours)
    .leftJoin(timesheetApprovals, eq(workHours.id, timesheetApprovals.timesheetId))
    .where(eq(workHours.employeeId, employeeId));
}

/**
 * Approve a timesheet
 */
export async function approveTimesheet(
  timesheetId: number,
  approverId: number,
  comments?: string
) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database connection failed" };
  
  // Update approval status
  await db
    .update(timesheetApprovals)
    .set({
      status: "approved",
      approvedAt: new Date(),
      comments,
    })
    .where(eq(timesheetApprovals.timesheetId, timesheetId));

  // Update timesheet status
  await db
    .update(workHours)
    .set({ status: "approved" })
    .where(eq(workHours.id, timesheetId));

  return { success: true, message: "Timesheet approved" };
}

/**
 * Reject a timesheet
 */
export async function rejectTimesheet(
  timesheetId: number,
  approverId: number,
  rejectionReason: string
) {
  const db = await getDb();
  if (!db) return { success: false, message: "Database connection failed" };
  
  // Update approval status
  await db
    .update(timesheetApprovals)
    .set({
      status: "rejected",
      rejectionReason,
    })
    .where(eq(timesheetApprovals.timesheetId, timesheetId));

  // Update timesheet status
  await db
    .update(workHours)
    .set({ status: "rejected" })
    .where(eq(workHours.id, timesheetId));

  return { success: true, message: "Timesheet rejected" };
}

/**
 * Create approval record for a new timesheet
 */
export async function createTimesheetApproval(
  timesheetId: number,
  approverId: number
) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.insert(timesheetApprovals).values({
    timesheetId,
    approverId,
    status: "pending",
  });

  return result;
}

/**
 * Get approval details for a timesheet
 */
export async function getTimesheetApprovalDetails(timesheetId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const approval = await db
    .select({
      id: timesheetApprovals.id,
      status: timesheetApprovals.status,
      comments: timesheetApprovals.comments,
      rejectionReason: timesheetApprovals.rejectionReason,
      approvedAt: timesheetApprovals.approvedAt,
      approverName: users.name,
      approverEmail: users.email,
    })
    .from(timesheetApprovals)
    .leftJoin(users, eq(timesheetApprovals.approverId, users.id))
    .where(eq(timesheetApprovals.timesheetId, timesheetId))
    .limit(1);

  return approval[0] || null;
}

import { getDb } from "../db";
import { timesheetApprovals, shifts, users } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Get all pending timesheet approvals for a manager
 */
export async function getPendingTimesheetApprovals(approverId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select({
        id: timesheetApprovals.id,
        shiftId: timesheetApprovals.shiftId,
        status: timesheetApprovals.status,
        comments: timesheetApprovals.comments,
        createdAt: timesheetApprovals.createdAt,
        employeeName: users.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(timesheetApprovals)
      .innerJoin(shifts, eq(timesheetApprovals.shiftId, shifts.id))
      .innerJoin(users, eq(shifts.employeeId, users.id))
      .where(
        and(
          eq(timesheetApprovals.approverId, approverId),
          eq(timesheetApprovals.status, "pending"),
        ),
      );
  } catch (error) {
    console.error("Failed to get pending timesheet approvals:", error);
    return [];
  }
}

/**
 * Get approval history for a specific employee
 */
export async function getTimesheetApprovalHistory(employeeId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select({
        id: timesheetApprovals.id,
        status: timesheetApprovals.status,
        approvedAt: timesheetApprovals.approvedAt,
        comments: timesheetApprovals.comments,
        rejectionReason: timesheetApprovals.rejectionReason,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(timesheetApprovals)
      .innerJoin(shifts, eq(timesheetApprovals.shiftId, shifts.id))
      .where(eq(shifts.employeeId, employeeId))
      .orderBy(desc(timesheetApprovals.createdAt));
  } catch (error) {
    console.error("Failed to get timesheet approval history:", error);
    return [];
  }
}

/**
 * Approve a timesheet
 */
export async function approveTimesheet(
  approvalId: number,
  approverId: number,
  comments?: string,
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.transaction(async (tx) => {
      // Update approval record
      await tx
        .update(timesheetApprovals)
        .set({
          status: "approved",
          approvedAt: new Date(),
          comments: comments || null,
        })
        .where(
          and(
            eq(timesheetApprovals.id, approvalId),
            eq(timesheetApprovals.approverId, approverId),
          ),
        );

      // Get the shift ID to update its status
      const approval = await tx
        .select()
        .from(timesheetApprovals)
        .where(eq(timesheetApprovals.id, approvalId))
        .limit(1);

      if (approval[0]) {
        await tx
          .update(shifts)
          .set({ status: "completed" })
          .where(eq(shifts.id, approval[0].shiftId));
      }
    });

    return true;
  } catch (error) {
    console.error("Failed to approve timesheet:", error);
    return false;
  }
}

/**
 * Reject a timesheet
 */
export async function rejectTimesheet(
  approvalId: number,
  approverId: number,
  rejectionReason: string,
) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(timesheetApprovals)
      .set({
        status: "rejected",
        rejectionReason,
      })
      .where(
        and(
          eq(timesheetApprovals.id, approvalId),
          eq(timesheetApprovals.approverId, approverId),
        ),
      );

    return true;
  } catch (error) {
    console.error("Failed to reject timesheet:", error);
    return false;
  }
}

/**
 * Request approval for a shift
 */
export async function requestTimesheetApproval(data: any) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .insert(timesheetApprovals)
      .values({
        shiftId: data.shiftId,
        comments: data.comments || null,
        status: data.status || "pending",
        createdAt: new Date(),
      })
      .returning({ id: timesheetApprovals.id });

    return result[0]?.id;
  } catch (error) {
    console.error("Failed to request timesheet approval:", error);
    return null;
  }
}

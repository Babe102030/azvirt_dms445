import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const timesheetApprovalsRouter = router({
  /**
   * Get all pending timesheets for approval
   */
  getPendingForApproval: protectedProcedure.query(async ({ ctx }) => {
    return await db.getPendingTimesheetApprovals(ctx.user.id);
  }),

  /**
   * Get approval history for a specific employee
   */
  getEmployeeHistory: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      return await db.getTimesheetApprovalHistory(input.employeeId);
    }),

  /**
   * Approve a timesheet approval request
   */
  approve: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        comments: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const success = await db.approveTimesheet(
        input.approvalId,
        ctx.user.id,
        input.comments,
      );
      return { success };
    }),

  /**
   * Reject a timesheet approval request
   */
  reject: protectedProcedure
    .input(
      z.object({
        approvalId: z.number(),
        rejectionReason: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const success = await db.rejectTimesheet(
        input.approvalId,
        ctx.user.id,
        input.rejectionReason,
      );
      return { success };
    }),

  /**
   * Request approval for a shift
   */
  requestApproval: protectedProcedure
    .input(
      z.object({
        shiftId: z.number(),
        comments: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const approvalId = await db.requestTimesheetApproval({
        shiftId: input.shiftId,
        comments: input.comments,
        status: "pending",
      });
      return { success: !!approvalId, approvalId };
    }),
});

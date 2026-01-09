import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getPendingTimesheets,
  getEmployeeTimesheets,
  approveTimesheet,
  rejectTimesheet,
  getTimesheetApprovalDetails,
} from "../db/timesheetApprovals";

export const timesheetApprovalsRouter = router({
  /**
   * Get all pending timesheets for the current manager
   */
  getPendingForApproval: protectedProcedure.query(async ({ ctx }: any) => {
    return await getPendingTimesheets(ctx.user.id);
  }),

  /**
   * Get all timesheets for an employee
   */
  getEmployeeTimesheets: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }: any) => {
      return await getEmployeeTimesheets(input.employeeId);
    }),

  /**
   * Approve a timesheet
   */
  approve: protectedProcedure
    .input(
      z.object({
        timesheetId: z.number(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      return await approveTimesheet(
        input.timesheetId,
        ctx.user.id,
        input.comments
      );
    }),

  /**
   * Reject a timesheet
   */
  reject: protectedProcedure
    .input(
      z.object({
        timesheetId: z.number(),
        rejectionReason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }: any) => {
      return await rejectTimesheet(
        input.timesheetId,
        ctx.user.id,
        input.rejectionReason
      );
    }),

  /**
   * Get approval details for a timesheet
   */
  getApprovalDetails: protectedProcedure
    .input(z.object({ timesheetId: z.number() }))
    .query(async ({ input }: any) => {
      return await getTimesheetApprovalDetails(input.timesheetId);
    }),
});

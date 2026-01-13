import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getAllEmployees,
  getShiftsForDateRange,
  getEmployeeShifts,
  assignEmployeeToShift,
  updateShiftAssignment,
  deleteShiftAssignment,
  checkShiftConflicts,
} from "../db/shiftAssignments";
import { getShiftTemplates } from "../db";

async function getAllShiftTemplates() {
  return await getShiftTemplates();
}

export const shiftAssignmentsRouter = router({
  /**
   * Get all shift templates
   */
  getTemplates: publicProcedure.query(async () => {
    return await getAllShiftTemplates();
  }),

  /**
   * Get all employees
   */
  getEmployees: publicProcedure.query(async () => {
    return await getAllEmployees();
  }),

  /**
   * Get shifts for a date range
   */
  getShiftsForRange: publicProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await getShiftsForDateRange(input.startDate, input.endDate);
    }),

  /**
   * Get shifts for a specific employee
   */
  getEmployeeShifts: publicProcedure
    .input(
      z.object({
        employeeId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return await getEmployeeShifts(input.employeeId, input.startDate, input.endDate);
    }),

  /**
   * Assign employee to a shift
   */
  assignShift: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
        shiftDate: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check for conflicts
      const conflicts = await checkShiftConflicts(input.employeeId, input.shiftDate);
      if (conflicts.length > 0) {
        throw new Error("Employee already has a shift on this date");
      }

      return await assignEmployeeToShift(
        input.employeeId,
        input.startTime,
        input.endTime,
        input.shiftDate,
        ctx.user.id
      );
    }),

  /**
   * Update shift assignment
   */
  updateShift: protectedProcedure
    .input(
      z.object({
        shiftId: z.number(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "no_show"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { shiftId, ...updates } = input;
      return await updateShiftAssignment(shiftId, updates);
    }),

  /**
   * Delete shift assignment
   */
  deleteShift: protectedProcedure
    .input(z.object({ shiftId: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteShiftAssignment(input.shiftId);
    }),

  /**
   * Check for conflicts
   */
  checkConflicts: publicProcedure
    .input(
      z.object({
        employeeId: z.number(),
        shiftDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const conflicts = await checkShiftConflicts(input.employeeId, input.shiftDate);
      return { hasConflicts: conflicts.length > 0, count: conflicts.length };
    }),
});

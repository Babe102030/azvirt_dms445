import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const shiftAssignmentsRouter = router({
  /**
   * Get all shift templates
   */
  getTemplates: publicProcedure.query(async () => {
    return await db.getShiftTemplates();
  }),

  /**
   * Get all employees for shift assignment
   */
  getEmployees: publicProcedure.query(async () => {
    return await db.getAllEmployeesForShifts();
  }),

  /**
   * Get shifts for a date range
   */
  getShiftsForRange: publicProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const shifts = await db.getAllShifts();
      // Filter by date range on the server side
      return shifts.filter(
        (s) => s.startTime >= input.startDate && s.startTime <= input.endDate,
      );
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
      }),
    )
    .query(async ({ input }) => {
      return await db.getShiftsByEmployee(
        input.employeeId,
        input.startDate,
        input.endDate,
      );
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
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await db.assignEmployeeToShift(
        input.employeeId,
        input.startTime,
        input.endTime,
        input.shiftDate,
        ctx.user.id,
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
        status: z
          .enum([
            "scheduled",
            "in_progress",
            "completed",
            "cancelled",
            "no_show",
          ])
          .optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { shiftId, ...updates } = input;
      const success = await db.updateShift(shiftId, updates);
      return { success };
    }),

  /**
   * Delete shift assignment
   */
  deleteShift: protectedProcedure
    .input(z.object({ shiftId: z.number() }))
    .mutation(async ({ input }) => {
      const success = await db.deleteShift(input.shiftId);
      return { success };
    }),

  /**
   * Check for conflicts
   */
  checkConflicts: publicProcedure
    .input(
      z.object({
        employeeId: z.number(),
        shiftDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const conflicts = await db.checkShiftConflicts(
        input.employeeId,
        input.shiftDate,
      );
      return { hasConflicts: conflicts.length > 0, count: conflicts.length };
    }),
});

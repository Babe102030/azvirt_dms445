import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const timesheetsRouter = router({
  // ============ SHIFT MANAGEMENT ============

  createShift: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        shiftDate: z.date(),
        startTime: z.date(),
        endTime: z.date(),
        breakDuration: z.number().default(0),
        projectId: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const shiftId = await db.createShift({
        employeeId: input.employeeId,
        shiftDate: input.shiftDate,
        startTime: input.startTime,
        endTime: input.endTime,
        breakDuration: input.breakDuration,
        projectId: input.projectId,
        notes: input.notes,
        status: "scheduled",
        createdBy: ctx.user.id,
      });
      return { success: !!shiftId, shiftId };
    }),

  getShifts: protectedProcedure
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

  updateShift: protectedProcedure
    .input(
      z.object({
        shiftId: z.number(),
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
      const success = await db.updateShift(input.shiftId, {
        status: input.status,
        notes: input.notes,
      });
      return { success };
    }),

  // ============ SHIFT TEMPLATES ============

  createShiftTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        startTime: z.string(), // HH:MM format
        endTime: z.string(), // HH:MM format
        breakDuration: z.number().default(0),
        daysOfWeek: z.array(z.number()), // 0-6
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const templateId = await db.createShiftTemplate({
        name: input.name,
        description: input.description,
        startTime: input.startTime,
        endTime: input.endTime,
        breakDuration: input.breakDuration,
        daysOfWeek: input.daysOfWeek,
        isActive: true,
        createdBy: ctx.user.id,
      });
      return { success: !!templateId, templateId };
    }),

  getShiftTemplates: protectedProcedure.query(async () => {
    return await db.getShiftTemplates();
  }),

  // ============ EMPLOYEE AVAILABILITY ============

  setAvailability: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        dayOfWeek: z.number(), // 0-6
        isAvailable: z.boolean(),
        startTime: z.string().optional(), // HH:MM format
        endTime: z.string().optional(), // HH:MM format
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await db.setEmployeeAvailability({
        employeeId: input.employeeId,
        dayOfWeek: input.dayOfWeek,
        isAvailable: input.isAvailable,
        startTime: input.startTime,
        endTime: input.endTime,
        notes: input.notes,
      });
      return { success };
    }),

  getAvailability: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getEmployeeAvailability(input.employeeId);
    }),

  // ============ COMPLIANCE & AUDIT ============

  logComplianceAudit: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        auditDate: z.date(),
        auditType: z.enum([
          "daily_hours",
          "weekly_hours",
          "break_compliance",
          "overtime",
          "wage_calculation",
        ]),
        status: z.enum(["compliant", "warning", "violation"]),
        details: z.record(z.string(), z.any()),
        severity: z.enum(["low", "medium", "high"]).default("low"),
        actionTaken: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const success = await db.logComplianceAudit({
        employeeId: input.employeeId,
        auditDate: input.auditDate,
        auditType: input.auditType,
        status: input.status,
        details: input.details,
        severity: input.severity,
        actionTaken: input.actionTaken,
        createdBy: ctx.user.id,
      });
      return { success };
    }),

  getComplianceAudits: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getComplianceAudits(
        input.employeeId,
        input.startDate,
        input.endDate,
      );
    }),

  // ============ BREAK TRACKING ============

  recordBreak: protectedProcedure
    .input(
      z.object({
        workHourId: z.number(),
        employeeId: z.number(),
        breakStart: z.date(),
        breakEnd: z.date().optional(),
        breakType: z.enum(["meal", "rest", "combined"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const breakDuration = input.breakEnd
        ? Math.round(
            (input.breakEnd.getTime() - input.breakStart.getTime()) /
              (1000 * 60),
          )
        : undefined;

      const success = await db.recordBreak({
        workHourId: input.workHourId,
        employeeId: input.employeeId,
        breakStart: input.breakStart,
        breakEnd: input.breakEnd,
        breakDuration,
        breakType: input.breakType,
        notes: input.notes,
      });
      return { success };
    }),

  getBreakRules: protectedProcedure
    .input(
      z.object({
        jurisdiction: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getBreakRules(input.jurisdiction);
    }),

  // ============ OFFLINE SYNC ============

  cacheOfflineEntry: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        deviceId: z.string(),
        entryData: z.object({
          date: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          projectId: z.number().optional(),
          notes: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await db.cacheOfflineEntry({
        employeeId: input.employeeId,
        deviceId: input.deviceId,
        entryData: input.entryData,
        syncStatus: "pending",
      });
      return { success };
    }),

  getPendingOfflineEntries: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      return await db.getPendingOfflineEntries(input.employeeId);
    }),

  syncOfflineEntry: protectedProcedure
    .input(
      z.object({
        cacheId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await db.updateOfflineSyncStatus(
        input.cacheId,
        "synced",
        new Date(),
      );
      return { success };
    }),

  // ============ SUMMARY REPORTS ============

  weeklySummary: protectedProcedure
    .input(
      z.object({
        employeeId: z.number().optional(),
        weekStart: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const weekEnd = new Date(input.weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      if (input.employeeId) {
        const shifts = await db.getShiftsByEmployee(
          input.employeeId,
          input.weekStart,
          weekEnd,
        );
        const totalHours = shifts.reduce((sum, shift) => {
          const hours =
            (shift.endTime.getTime() - shift.startTime.getTime()) /
            (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        return {
          weekStart: input.weekStart,
          weekEnd,
          employeeId: input.employeeId,
          totalShifts: shifts.length,
          totalHours: Math.round(totalHours * 100) / 100,
          shifts,
        };
      }

      return {
        weekStart: input.weekStart,
        weekEnd,
        totalShifts: 0,
        totalHours: 0,
        shifts: [],
      };
    }),

  monthlySummary: protectedProcedure
    .input(
      z.object({
        employeeId: z.number().optional(),
        year: z.number(),
        month: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const monthStart = new Date(input.year, input.month - 1, 1);
      const monthEnd = new Date(input.year, input.month, 0);

      if (input.employeeId) {
        const shifts = await db.getShiftsByEmployee(
          input.employeeId,
          monthStart,
          monthEnd,
        );
        const totalHours = shifts.reduce((sum, shift) => {
          const hours =
            (shift.endTime.getTime() - shift.startTime.getTime()) /
            (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        const audits = await db.getComplianceAudits(
          input.employeeId,
          monthStart,
          monthEnd,
        );
        const violations = audits.filter(
          (a) => a.status === "violation",
        ).length;

        return {
          year: input.year,
          month: input.month,
          employeeId: input.employeeId,
          totalShifts: shifts.length,
          totalHours: Math.round(totalHours * 100) / 100,
          complianceViolations: violations,
          shifts,
          audits,
        };
      }

      return {
        year: input.year,
        month: input.month,
        totalShifts: 0,
        totalHours: 0,
        complianceViolations: 0,
        shifts: [],
        audits: [],
      };
    }),

  // ============ BACKWARD COMPATIBILITY ============
  // These procedures maintain compatibility with existing UI components

  list: protectedProcedure
    .input(
      z
        .object({
          employeeId: z.number().optional(),
          status: z.enum(["pending", "approved", "rejected"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      if (input?.employeeId && input?.startDate && input?.endDate) {
        return await db.getShiftsByEmployee(
          input.employeeId,
          input.startDate,
          input.endDate,
        );
      }
      return [];
    }),

  clockIn: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        projectId: z.number().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const shiftId = await db.createShift({
        employeeId: input.employeeId,
        shiftDate: new Date(),
        startTime: new Date(),
        endTime: new Date(),
        projectId: input.projectId,
        notes: input.notes,
        status: "in_progress",
        createdBy: 1,
      });
      return { success: !!shiftId, shiftId: shiftId || 0 };
    }),

  clockOut: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await db.updateShift(input.id, {
        endTime: new Date(),
        status: "completed",
      });
      return { success };
    }),

  create: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        date: z.date(),
        startTime: z.date(),
        endTime: z.date().optional(),
        hoursWorked: z.number().optional(),
        overtimeHours: z.number().optional(),
        workType: z
          .enum(["regular", "overtime", "weekend", "holiday"])
          .optional(),
        projectId: z.number().optional(),
        notes: z.string().optional(),
        status: z.enum(["pending", "approved", "rejected"]).default("pending"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const shiftId = await db.createShift({
        employeeId: input.employeeId,
        shiftDate: input.date,
        startTime: input.startTime,
        endTime: input.endTime || new Date(),
        projectId: input.projectId,
        notes: input.notes,
        status: input.status === "approved" ? "completed" : "scheduled",
        createdBy: ctx.user.id,
      });
      return { success: !!shiftId, shiftId: shiftId || 0 };
    }),

  approve: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        approvedBy: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await db.updateShift(input.id, {
        status: "completed",
      });
      return { success };
    }),

  reject: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const success = await db.updateShift(input.id, {
        status: "cancelled",
        notes: input.reason,
      });
      return { success };
    }),
});

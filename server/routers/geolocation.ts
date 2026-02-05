import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createJobSite,
  getJobSites,
  createLocationLog,
  recordGeofenceViolation,
  getLocationHistory,
  getGeofenceViolations,
  resolveGeofenceViolation,
  getShiftById,
  getEmployeeById,
} from "../db";
import {
  calculateDistance,
  isWithinCircularGeofence,
  distanceToGeofence,
  isGPSAccuracyAcceptable,
  isValidGPSCoordinate,
  generateViolationMessage,
} from "../services/geolocation";
import { notifyOwner } from "../_core/notification";

export const geolocationRouter = router({
  /**
   * Create a new job site with geofence
   */
  createJobSite: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        geofenceRadius: z.number().min(10).max(5000).optional(),
        address: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can create job sites");
      }

      const jobSiteId = await createJobSite({
        ...input,
        createdBy: ctx.user.id,
      });

      return { success: true, jobSiteId };
    }),

  /**
   * Get all job sites for a project
   */
  getJobSites: protectedProcedure
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ input }) => {
      return await getJobSites(input.projectId);
    }),

  /**
   * Check in with GPS location
   * Validates geofence and logs location
   */
  checkIn: protectedProcedure
    .input(
      z.object({
        shiftId: z.number(),
        jobSiteId: z.number(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Validate GPS coordinates
      if (!isValidGPSCoordinate(input.latitude, input.longitude)) {
        throw new Error("Invalid GPS coordinates");
      }

      // Check GPS accuracy
      if (input.accuracy && !isGPSAccuracyAcceptable(input.accuracy)) {
        throw new Error(
          `GPS accuracy is ${Math.round(input.accuracy)}m. Please try again in an open area.`,
        );
      }

      // Get shift details
      const shift = await getShiftById(input.shiftId);
      if (!shift) {
        throw new Error("Shift not found");
      }

      if (shift.employeeId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You can only check in for your own shifts");
      }

      // Get job site details
      const jobSites = await getJobSites();
      const jobSite = jobSites.find((js: any) => js.id === input.jobSiteId);
      if (!jobSite) {
        throw new Error("Job site not found");
      }

      // Check if within geofence
      const jobSiteLat = parseFloat(jobSite.latitude as any);
      const jobSiteLon = parseFloat(jobSite.longitude as any);
      const isWithinGeofence = isWithinCircularGeofence(
        input.latitude,
        input.longitude,
        jobSiteLat,
        jobSiteLon,
        jobSite.geofenceRadius,
      );

      const distanceFromGeofence = distanceToGeofence(
        input.latitude,
        input.longitude,
        jobSiteLat,
        jobSiteLon,
        jobSite.geofenceRadius,
      );

      // Log location
      const locationLogId = await createLocationLog({
        shiftId: input.shiftId,
        employeeId: shift.employeeId,
        jobSiteId: input.jobSiteId,
        eventType: "check_in",
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        isWithinGeofence,
        distanceFromGeofence: Math.max(0, Math.round(distanceFromGeofence)),
        deviceId: input.deviceId,
      });

      // Record violation if outside geofence
      if (!isWithinGeofence && distanceFromGeofence > 0) {
        const violationId = await recordGeofenceViolation({
          locationLogId,
          employeeId: shift.employeeId,
          jobSiteId: input.jobSiteId,
          violationType: "check_in_outside",
          distanceFromGeofence: Math.round(distanceFromGeofence),
          severity: distanceFromGeofence > 500 ? "violation" : "warning",
        });

        // Get employee details for notification
        const employee = await getEmployeeById(shift.employeeId);
        const employeeName = employee
          ? `${employee.firstName} ${employee.lastName}`
          : "Employee";
        const message = generateViolationMessage(
          employeeName,
          jobSite.name,
          Math.round(distanceFromGeofence),
          "check_in",
        );

        // Notify owner of violation
        await notifyOwner({
          title: "Geofence Violation - Check In",
          content: message,
        });

        return {
          success: true,
          locationLogId,
          isWithinGeofence: false,
          distanceFromGeofence: Math.round(distanceFromGeofence),
          violationId,
          warning: `Check-in recorded but outside geofence by ${Math.round(distanceFromGeofence)}m`,
        };
      }

      return {
        success: true,
        locationLogId,
        isWithinGeofence: true,
        distanceFromGeofence: 0,
        message: "Check-in successful",
      };
    }),

  /**
   * Check out with GPS location
   * Validates geofence and logs location
   */
  checkOut: protectedProcedure
    .input(
      z.object({
        shiftId: z.number(),
        jobSiteId: z.number(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        deviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Validate GPS coordinates
      if (!isValidGPSCoordinate(input.latitude, input.longitude)) {
        throw new Error("Invalid GPS coordinates");
      }

      // Check GPS accuracy
      if (input.accuracy && !isGPSAccuracyAcceptable(input.accuracy)) {
        throw new Error(
          `GPS accuracy is ${Math.round(input.accuracy)}m. Please try again in an open area.`,
        );
      }

      // Get shift details
      const shift = await getShiftById(input.shiftId);
      if (!shift) {
        throw new Error("Shift not found");
      }

      if (shift.employeeId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You can only check out for your own shifts");
      }

      // Get job site details
      const jobSites = await getJobSites();
      const jobSite = jobSites.find((js: any) => js.id === input.jobSiteId);
      if (!jobSite) {
        throw new Error("Job site not found");
      }

      // Check if within geofence
      const jobSiteLat = parseFloat(jobSite.latitude as any);
      const jobSiteLon = parseFloat(jobSite.longitude as any);
      const isWithinGeofence = isWithinCircularGeofence(
        input.latitude,
        input.longitude,
        jobSiteLat,
        jobSiteLon,
        jobSite.geofenceRadius,
      );

      const distanceFromGeofence = distanceToGeofence(
        input.latitude,
        input.longitude,
        jobSiteLat,
        jobSiteLon,
        jobSite.geofenceRadius,
      );

      // Log location
      const locationLogId = await createLocationLog({
        shiftId: input.shiftId,
        employeeId: shift.employeeId,
        jobSiteId: input.jobSiteId,
        eventType: "check_out",
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy,
        isWithinGeofence,
        distanceFromGeofence: Math.max(0, Math.round(distanceFromGeofence)),
        deviceId: input.deviceId,
      });

      // Record violation if outside geofence
      if (!isWithinGeofence && distanceFromGeofence > 0) {
        const violationId = await recordGeofenceViolation({
          locationLogId,
          employeeId: shift.employeeId,
          jobSiteId: input.jobSiteId,
          violationType: "check_out_outside",
          distanceFromGeofence: Math.round(distanceFromGeofence),
          severity: distanceFromGeofence > 500 ? "violation" : "warning",
        });

        // Get employee details for notification
        const employee = await getEmployeeById(shift.employeeId);
        const employeeName = employee
          ? `${employee.firstName} ${employee.lastName}`
          : "Employee";
        const message = generateViolationMessage(
          employeeName,
          jobSite.name,
          Math.round(distanceFromGeofence),
          "check_out",
        );

        // Notify owner of violation
        await notifyOwner({
          title: "Geofence Violation - Check Out",
          content: message,
        });

        return {
          success: true,
          locationLogId,
          isWithinGeofence: false,
          distanceFromGeofence: Math.round(distanceFromGeofence),
          violationId,
          warning: `Check-out recorded but outside geofence by ${Math.round(distanceFromGeofence)}m`,
        };
      }

      return {
        success: true,
        locationLogId,
        isWithinGeofence: true,
        distanceFromGeofence: 0,
        message: "Check-out successful",
      };
    }),

  /**
   * Get location history for current user
   */
  getLocationHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }))
    .query(async ({ input, ctx }) => {
      return await getLocationHistory(ctx.user.id, input.limit);
    }),

  /**
   * Get geofence violations for current user
   */
  getViolations: protectedProcedure
    .input(z.object({ resolved: z.boolean().optional() }))
    .query(async ({ input, ctx }) => {
      return await getGeofenceViolations(ctx.user.id, input.resolved);
    }),

  /**
   * Get all geofence violations (admin only)
   */
  getAllViolations: protectedProcedure
    .input(
      z.object({
        employeeId: z.number().optional(),
        resolved: z.boolean().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can view all violations");
      }

      return await getGeofenceViolations(input.employeeId, input.resolved);
    }),

  /**
   * Resolve a geofence violation (admin only)
   */
  resolveViolation: protectedProcedure
    .input(
      z.object({
        violationId: z.number(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Only admins can resolve violations");
      }

      const success = await resolveGeofenceViolation(
        input.violationId,
        ctx.user.id,
        input.notes,
      );

      if (!success) {
        throw new Error("Failed to resolve violation");
      }

      return { success: true, message: "Violation resolved" };
    }),
});

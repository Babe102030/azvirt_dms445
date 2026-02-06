import { z } from "zod";

/**
 * Geolocation schema for GPS coordinates
 * Latitude: -90 to 90
 * Longitude: -180 to 180
 * Accuracy: in meters (0-10000)
 */
export const GeolocationSchema = z.object({
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .describe("Latitude coordinate (-90 to 90)"),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe("Longitude coordinate (-180 to 180)"),
  accuracy: z
    .number()
    .min(0)
    .max(10000)
    .describe("GPS accuracy in meters"),
  timestamp: z.number().describe("Timestamp in milliseconds"),
});

/**
 * Check-in request schema
 * Includes location data and device information
 */
export const CheckInRequestSchema = z.object({
  shiftId: z.number().int().positive().describe("ID of the shift"),
  location: GeolocationSchema,
  deviceInfo: z.object({
    userAgent: z.string().describe("Browser user agent"),
    timezone: z.string().describe("Device timezone (e.g., America/New_York)"),
  }),
});

/**
 * Project site schema for geofence configuration
 */
export const ProjectSiteSchema = z.object({
  id: z.number().int().positive().optional(),
  projectId: z.number().int().positive().describe("Associated project ID"),
  name: z
    .string()
    .min(1)
    .max(255)
    .describe("Name of the project site"),
  latitude: z.number().min(-90).max(90).describe("Site center latitude"),
  longitude: z.number().min(-180).max(180).describe("Site center longitude"),
  geofenceRadiusKm: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Geofence radius in kilometers"),
  address: z.string().optional().describe("Street address of the site"),
});

// Export types inferred from schemas
export type Geolocation = z.infer<typeof GeolocationSchema>;
export type CheckInRequest = z.infer<typeof CheckInRequestSchema>;
export type ProjectSite = z.infer<typeof ProjectSiteSchema>;

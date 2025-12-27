import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateDistance,
  isWithinCircularGeofence,
  distanceToGeofence,
  isGPSAccuracyAcceptable,
  isValidGPSCoordinate,
  isSuspiciousLocation,
  generateViolationMessage,
} from "./services/geolocation";

describe("Geolocation Service", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two coordinates correctly", () => {
      // New York to Los Angeles (approximately 3944 km)
      const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900000); // meters
      expect(distance).toBeLessThan(4000000);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBeLessThan(1);
    });

    it("should calculate short distances accurately", () => {
      // Two points approximately 1.1 km apart
      const distance = calculateDistance(40.7128, -74.006, 40.7228, -74.006);
      expect(distance).toBeGreaterThan(1000); // ~1.1 km
      expect(distance).toBeLessThan(1500);
    });
  });

  describe("isWithinCircularGeofence", () => {
    const centerLat = 40.7128;
    const centerLon = -74.006;
    const radius = 100; // 100 meters

    it("should return true for point within geofence", () => {
      const isWithin = isWithinCircularGeofence(
        40.71285,
        -74.006,
        centerLat,
        centerLon,
        radius
      );
      expect(isWithin).toBe(true);
    });

    it("should return false for point outside geofence", () => {
      const isWithin = isWithinCircularGeofence(
        40.715,
        -74.006,
        centerLat,
        centerLon,
        radius
      );
      expect(isWithin).toBe(false);
    });

    it("should return true for point at geofence boundary", () => {
      // Point approximately at radius distance
      const isWithin = isWithinCircularGeofence(
        40.71289,
        -74.006,
        centerLat,
        centerLon,
        100
      );
      expect(isWithin).toBe(true);
    });
  });

  describe("distanceToGeofence", () => {
    const centerLat = 40.7128;
    const centerLon = -74.006;
    const radius = 100;

    it("should return negative distance for point inside geofence", () => {
      const distance = distanceToGeofence(
        40.71285,
        -74.006,
        centerLat,
        centerLon,
        radius
      );
      expect(distance).toBeLessThan(0);
    });

    it("should return positive distance for point outside geofence", () => {
      const distance = distanceToGeofence(
        40.715,
        -74.006,
        centerLat,
        centerLon,
        radius
      );
      expect(distance).toBeGreaterThan(0);
    });

    it("should return approximately 0 for point at boundary", () => {
      const distance = distanceToGeofence(
        40.71289,
        -74.006,
        centerLat,
        centerLon,
        100
      );
      expect(Math.abs(distance)).toBeLessThan(100);
    });
  });

  describe("isGPSAccuracyAcceptable", () => {
    it("should return true for accuracy <= 50 meters", () => {
      expect(isGPSAccuracyAcceptable(25)).toBe(true);
      expect(isGPSAccuracyAcceptable(50)).toBe(true);
    });

    it("should return false for accuracy > 50 meters", () => {
      expect(isGPSAccuracyAcceptable(51)).toBe(false);
      expect(isGPSAccuracyAcceptable(100)).toBe(false);
    });

    it("should return false for undefined accuracy", () => {
      expect(isGPSAccuracyAcceptable(undefined)).toBe(false);
    });

    it("should respect custom threshold", () => {
      expect(isGPSAccuracyAcceptable(75, 100)).toBe(true);
      expect(isGPSAccuracyAcceptable(101, 100)).toBe(false);
    });
  });

  describe("isValidGPSCoordinate", () => {
    it("should return true for valid coordinates", () => {
      expect(isValidGPSCoordinate(40.7128, -74.006)).toBe(true);
      expect(isValidGPSCoordinate(0, 0)).toBe(true);
      expect(isValidGPSCoordinate(-90, 180)).toBe(true);
    });

    it("should return false for invalid latitude", () => {
      expect(isValidGPSCoordinate(91, 0)).toBe(false);
      expect(isValidGPSCoordinate(-91, 0)).toBe(false);
    });

    it("should return false for invalid longitude", () => {
      expect(isValidGPSCoordinate(0, 181)).toBe(false);
      expect(isValidGPSCoordinate(0, -181)).toBe(false);
    });

    it("should return false for non-number values", () => {
      expect(isValidGPSCoordinate("40" as any, -74)).toBe(false);
      expect(isValidGPSCoordinate(40, "74" as any)).toBe(false);
    });
  });

  describe("isSuspiciousLocation", () => {
    it("should return false for normal movement", () => {
      // 100 meters in 60 seconds = 1.67 m/s (realistic walking speed)
      const isSuspicious = isSuspiciousLocation(
        40.7128,
        -74.006,
        40.71289,
        -74.006,
        60
      );
      expect(isSuspicious).toBe(false);
    });

    it("should return true for unrealistic movement", () => {
      // 10 km in 1 second (impossible without vehicle)
      const isSuspicious = isSuspiciousLocation(
        40.7128,
        -74.006,
        40.8128,
        -74.006,
        1,
        50 // 50 m/s max speed
      );
      expect(isSuspicious).toBe(true);
    });

    it("should return false for vehicle-like movement", () => {
      // 5 km in 300 seconds = 16.67 m/s (60 km/h)
      const isSuspicious = isSuspiciousLocation(
        40.7128,
        -74.006,
        40.7628,
        -74.006,
        300,
        50 // 50 m/s max speed
      );
      expect(isSuspicious).toBe(false);
    });
  });

  describe("generateViolationMessage", () => {
    it("should generate check-in violation message", () => {
      const message = generateViolationMessage(
        "John Doe",
        "Construction Site A",
        150,
        "check_in"
      );
      expect(message).toContain("John Doe");
      expect(message).toContain("checked in");
      expect(message).toContain("Construction Site A");
      expect(message).toContain("150m");
    });

    it("should generate check-out violation message", () => {
      const message = generateViolationMessage(
        "Jane Smith",
        "Job Site B",
        250,
        "check_out"
      );
      expect(message).toContain("Jane Smith");
      expect(message).toContain("checked out");
      expect(message).toContain("Job Site B");
      expect(message).toContain("250m");
    });
  });

  describe("Edge Cases", () => {
    it("should handle coordinates at poles", () => {
      const distanceNorthPole = calculateDistance(90, 0, 89, 0);
      expect(distanceNorthPole).toBeGreaterThan(0);

      const distanceSouthPole = calculateDistance(-90, 0, -89, 0);
      expect(distanceSouthPole).toBeGreaterThan(0);
    });

    it("should handle coordinates crossing date line", () => {
      // Crossing international date line
      const distance = calculateDistance(0, 179, 0, -179);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(300000); // ~200 km
    });

    it("should handle very small geofence radius", () => {
      const isWithin = isWithinCircularGeofence(
        40.7128,
        -74.006,
        40.7128,
        -74.006,
        1 // 1 meter radius
      );
      expect(isWithin).toBe(true);
    });

    it("should handle very large geofence radius", () => {
      const isWithin = isWithinCircularGeofence(
        40.7128,
        -74.006,
        34.0522,
        -118.2437,
        5000000 // 5000 km radius
      );
      expect(isWithin).toBe(true);
    });
  });

  describe("Precision Tests", () => {
    it("should maintain precision for nearby coordinates", () => {
      const distance1 = calculateDistance(40.7128, -74.006, 40.71281, -74.006);
      const distance2 = calculateDistance(40.7128, -74.006, 40.71282, -74.006);
      expect(distance2).toBeGreaterThan(distance1);
    });

    it("should handle floating point precision", () => {
      const distance = calculateDistance(
        40.712800001,
        -74.006000001,
        40.712800002,
        -74.006000002
      );
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThan(1);
    });
  });
});

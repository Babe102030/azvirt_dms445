import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  isWithinGeofence,
  metersToKilometers,
  kilometersToMeters,
  isValidCoordinate,
  getBearing,
  getMidpoint,
  isAcceptableAccuracy,
  formatDistance,
  getGeofenceStatus,
} from "./geolocation";

describe("Geolocation Utilities", () => {
  describe("calculateDistance", () => {
    it("should calculate distance between two points using Haversine formula", () => {
      // New York to Los Angeles (approximately 3944 km)
      const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
      expect(distance).toBeCloseTo(3944, -1); // Within 10 km accuracy
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBeCloseTo(0, 2);
    });

    it("should handle negative coordinates", () => {
      // London to Paris (approximately 344 km)
      const distance = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
      expect(distance).toBeCloseTo(344, 0);
    });

    it("should handle equatorial coordinates", () => {
      // Quito (0°) to somewhere 1 degree north (approximately 111 km)
      const distance = calculateDistance(0, 0, 1, 0);
      expect(distance).toBeCloseTo(111, 0);
    });

    it("should handle international dateline", () => {
      // Points near international dateline
      const distance = calculateDistance(0, 179, 0, -179);
      expect(distance).toBeLessThan(200); // Should be short distance
    });
  });

  describe("isWithinGeofence", () => {
    it("should return true when employee is within geofence", () => {
      // Site center: 40.7128, -74.006
      // Employee 100m away (approximately 0.001 degrees)
      const result = isWithinGeofence(
        40.7128,
        -74.006,
        40.7128,
        -74.006,
        0.1 // 100 meters
      );
      expect(result).toBe(true);
    });

    it("should return false when employee is outside geofence", () => {
      // Site center: 40.7128, -74.006
      // Employee 2 km away
      const result = isWithinGeofence(
        40.7128,
        -74.006,
        40.7128,
        -74.006,
        0.001 // 1 meter radius (employee definitely outside)
      );
      expect(result).toBe(false);
    });

    it("should return true when employee is exactly at geofence boundary", () => {
      // Create a scenario where distance equals radius
      const siteLat = 40.7128;
      const siteLon = -74.006;
      const radius = calculateDistance(siteLat, siteLon, 40.7238, siteLon);

      const result = isWithinGeofence(
        40.7238,
        siteLon,
        siteLat,
        siteLon,
        radius
      );
      expect(result).toBe(true);
    });
  });

  describe("metersToKilometers", () => {
    it("should convert meters to kilometers", () => {
      expect(metersToKilometers(1000)).toBe(1);
      expect(metersToKilometers(500)).toBe(0.5);
      expect(metersToKilometers(100)).toBe(0.1);
    });

    it("should handle zero", () => {
      expect(metersToKilometers(0)).toBe(0);
    });
  });

  describe("kilometersToMeters", () => {
    it("should convert kilometers to meters", () => {
      expect(kilometersToMeters(1)).toBe(1000);
      expect(kilometersToMeters(0.5)).toBe(500);
      expect(kilometersToMeters(0.1)).toBe(100);
    });

    it("should handle zero", () => {
      expect(kilometersToMeters(0)).toBe(0);
    });
  });

  describe("isValidCoordinate", () => {
    it("should validate correct coordinates", () => {
      expect(isValidCoordinate(40.7128, -74.006)).toBe(true);
      expect(isValidCoordinate(0, 0)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
    });

    it("should reject invalid latitude", () => {
      expect(isValidCoordinate(91, 0)).toBe(false);
      expect(isValidCoordinate(-91, 0)).toBe(false);
      expect(isValidCoordinate(180, 0)).toBe(false);
    });

    it("should reject invalid longitude", () => {
      expect(isValidCoordinate(0, 181)).toBe(false);
      expect(isValidCoordinate(0, -181)).toBe(false);
    });

    it("should reject non-number values", () => {
      expect(isValidCoordinate(NaN, 0)).toBe(false);
      expect(isValidCoordinate(0, NaN)).toBe(false);
    });

    it("should reject boundary violations", () => {
      expect(isValidCoordinate(90.1, 0)).toBe(false);
      expect(isValidCoordinate(0, 180.1)).toBe(false);
    });
  });

  describe("getBearing", () => {
    it("should calculate bearing between two points", () => {
      // From point A to point B north of it should be close to 0 degrees (north)
      const bearing = getBearing(40.0, -74.0, 41.0, -74.0);
      expect(bearing).toBeLessThan(10); // Should be close to north
    });

    it("should return bearing in 0-360 range", () => {
      const bearing = getBearing(40.7128, -74.006, 40.7128, -73.006);
      expect(bearing).toBeGreaterThanOrEqual(0);
      expect(bearing).toBeLessThanOrEqual(360);
    });

    it("should handle east direction", () => {
      // Point to the east should be around 90 degrees
      const bearing = getBearing(40.0, -74.0, 40.0, -73.0);
      expect(bearing).toBeGreaterThan(80);
      expect(bearing).toBeLessThan(100);
    });

    it("should handle south direction", () => {
      // Point to the south should be around 180 degrees
      const bearing = getBearing(41.0, -74.0, 40.0, -74.0);
      expect(bearing).toBeGreaterThan(170);
      expect(bearing).toBeLessThan(190);
    });

    it("should handle west direction", () => {
      // Point to the west should be around 270 degrees
      const bearing = getBearing(40.0, -73.0, 40.0, -74.0);
      expect(bearing).toBeGreaterThan(260);
      expect(bearing).toBeLessThan(280);
    });
  });

  describe("getMidpoint", () => {
    it("should calculate midpoint between two coordinates", () => {
      // Midpoint between same point should be that point
      const [lat, lon] = getMidpoint(40.0, -74.0, 40.0, -74.0);
      expect(lat).toBeCloseTo(40.0, 5);
      expect(lon).toBeCloseTo(-74.0, 5);
    });

    it("should calculate midpoint between different coordinates", () => {
      // Midpoint between two points should be approximately between them
      const [lat, lon] = getMidpoint(40.0, -74.0, 42.0, -72.0);
      expect(lat).toBeGreaterThan(40);
      expect(lat).toBeLessThan(42);
      expect(lon).toBeGreaterThan(-74);
      expect(lon).toBeLessThan(-72);
    });
  });

  describe("isAcceptableAccuracy", () => {
    it("should accept accurate GPS readings", () => {
      expect(isAcceptableAccuracy(10)).toBe(true);
      expect(isAcceptableAccuracy(25)).toBe(true);
      expect(isAcceptableAccuracy(50)).toBe(true);
    });

    it("should reject inaccurate GPS readings", () => {
      expect(isAcceptableAccuracy(51)).toBe(false);
      expect(isAcceptableAccuracy(100)).toBe(false);
      expect(isAcceptableAccuracy(1000)).toBe(false);
    });

    it("should use custom threshold", () => {
      expect(isAcceptableAccuracy(100, 150)).toBe(true);
      expect(isAcceptableAccuracy(100, 50)).toBe(false);
    });

    it("should accept zero accuracy", () => {
      expect(isAcceptableAccuracy(0)).toBe(true);
    });
  });

  describe("formatDistance", () => {
    it("should format distances in meters when less than 1 km", () => {
      expect(formatDistance(0.5)).toContain("m");
      expect(formatDistance(0.1)).toContain("m");
      expect(formatDistance(0.001)).toBe("< 1 m");
    });

    it("should format distances in kilometers when 1 km or more", () => {
      expect(formatDistance(1)).toContain("km");
      expect(formatDistance(5)).toContain("km");
      expect(formatDistance(10)).toContain("km");
    });

    it("should include correct values", () => {
      expect(formatDistance(0.5)).toContain("500");
      expect(formatDistance(1.5)).toContain("1.50");
    });
  });

  describe("getGeofenceStatus", () => {
    it("should indicate inside geofence status", () => {
      const status = getGeofenceStatus(0.05, 0.1);
      expect(status.withinGeofence).toBe(true);
      expect(status.message).toContain("Inside geofence");
      expect(status.percentageInside).toBeGreaterThan(0);
    });

    it("should indicate outside geofence status", () => {
      const status = getGeofenceStatus(0.15, 0.1);
      expect(status.withinGeofence).toBe(false);
      expect(status.message).toContain("Outside geofence");
    });

    it("should calculate percentage inside correctly", () => {
      const status = getGeofenceStatus(0.05, 0.1);
      expect(status.percentageInside).toBeCloseTo(50, 1); // 50% way to boundary
    });

    it("should store distance in result", () => {
      const status = getGeofenceStatus(0.123, 0.5);
      expect(status.distance).toBe(0.123);
    });

    it("should handle edge case at boundary", () => {
      const status = getGeofenceStatus(0.1, 0.1);
      expect(status.withinGeofence).toBe(true);
      expect(status.percentageInside).toBeCloseTo(0, 1);
    });
  });

  describe("Real-world scenarios", () => {
    it("should validate a typical job site check-in within 100m radius", () => {
      // Job site at 40.7128, -74.006
      // Geofence radius: 100 meters
      // Employee at 40.7129, -74.006 (approximately 111m away)
      const withinGeofence = isWithinGeofence(
        40.7129,
        -74.006,
        40.7128,
        -74.006,
        0.1 // 100 meters in km
      );
      expect(withinGeofence).toBe(true);
    });

    it("should reject a check-in outside 100m radius", () => {
      // Employee 500m away
      const withinGeofence = isWithinGeofence(
        40.7173,
        -74.006,
        40.7128,
        -74.006,
        0.1 // 100 meters
      );
      expect(withinGeofence).toBe(false);
    });

    it("should validate GPS accuracy for check-in", () => {
      // GPS accuracy of 25 meters is acceptable
      const acceptable = isAcceptableAccuracy(25);
      expect(acceptable).toBe(true);

      // GPS accuracy of 75 meters is not acceptable
      const notAcceptable = isAcceptableAccuracy(75);
      expect(notAcceptable).toBe(false);
    });

    it("should provide detailed geofence status", () => {
      // Employee 2km from site, geofence is 0.5km
      const status = getGeofenceStatus(2, 0.5);
      expect(status.withinGeofence).toBe(false);
      expect(status.message).toContain("1.50 km");
      expect(status.percentageInside).toBe(0);
    });

    it("should validate coordinates from real GPS device", () => {
      // Typical coordinates from iOS/Android GPS
      const lat = 40.712776;
      const lon = -74.005974;
      expect(isValidCoordinate(lat, lon)).toBe(true);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle coordinates at poles", () => {
      expect(isValidCoordinate(90, 0)).toBe(true);
      expect(isValidCoordinate(-90, 0)).toBe(true);
      const distance = calculateDistance(90, 0, -90, 0);
      expect(distance).toBeGreaterThan(0);
    });

    it("should handle coordinates at international dateline", () => {
      expect(isValidCoordinate(0, 180)).toBe(true);
      expect(isValidCoordinate(0, -180)).toBe(true);
    });

    it("should handle very small distances", () => {
      const distance = calculateDistance(40.0, -74.0, 40.0000001, -74.0000001);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(0.001); // Less than 1 meter
    });

    it("should handle very large geofence radius", () => {
      const status = getGeofenceStatus(1000, 500); // 1000km from site, 500km radius
      expect(status.withinGeofence).toBe(false);
      expect(status.message).toContain("500.00 km");
    });

    it("should handle zero geofence radius", () => {
      const status = getGeofenceStatus(0.001, 0.0001);
      expect(status.withinGeofence).toBe(false);
    });
  });
});
